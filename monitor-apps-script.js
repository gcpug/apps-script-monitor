/**
 * Firewall Rule: 64.18.0.0/20,64.233.160.0/19,66.102.0.0/20,66.249.80.0/20,72.14.192.0/18,74.125.0.0/16,173.194.0.0/16,207.126.144.0/20,209.85.128.0/17,216.239.32.0/19
 */
var retry = 1
  , reqUrl = ''
  , max = 6
  , _sleep = 1000
  , house_keep_max_rows = 2000
  , me = 'admin-email@gmail.com'
  , calendarId = 'your-calendar-id@group.calendar.google.com'
  , sheetId = 'your-sheet-id'
  , sites = []
  , cfg = {
    recipient: 'admin-email@gmail.com',
    subject: 'Notify Email Title', 
    body: '', 
    options: {
      from: me,
      htmlBody:''
    }
  }
  , admin_notify_mail = 'Dear Admin: <br/><br/>The monitor from AppsScript show %s(%s) cannot connect after %s' + 
    ' times retry! <br/>Please check the network of it. <br/><br/>Error Message: <br/>%s' +
    '<br/><br/><br/><br/>Send by Google AppsScript.';

/**
 * Initialize environment
 */
function init(app) {
  var sheet = app.getSheetByName("Config");
  var rows = sheet.getDataRange();
  var numRows = rows.getNumRows();
  var values = rows.getValues();
  if(numRows > 1) {
    for (var i = 1; i <= numRows - 1; i++) {
      var s = {};
      var row = values[i];
      Logger.log(i + "::" + row[0] + "::" + row[1]);
      s['name'] = row[0];
      s['url'] = row[1];
      s['owner'] = row[2];
      sites.push(s);
    }
  }
  Logger.log("[SITES]: " + sites.length);
  return sites;
}

function test() {
  addLineChart('ewant-gcp-haproxy')
}

function addLineChart(sheet) {
 var chart = sheet.newChart()
     .setChartType(Charts.ChartType.LINE)
     .addRange(sheet.getRange("B1:B967"))
     .addRange(sheet.getRange("E1:E967"))
     .addRange(sheet.getRange("F1:F967"))
     .addRange(sheet.getRange("G1:G967"))
     .addRange(sheet.getRange("H1:H967"))
     .setOption('title', 'NOMON ' + sheet.getName() + ' Status Chart')
     .setOption('animation.duration', 500)
     .setPosition(2,9,0,0)
     .build();

  sheet.insertChart(chart);
}

/**
 * 透過UrlFetch的服務來進行網站Response Time的監控
 * sites: 定義要監控的http點
 * sheet欄位：HTTP監控點, 觸發時間, 耗時(ms), HTTP Response Code
 */
function emitRequestAndRecord() {
  Logger.log("Start...");
  
  var app = SpreadsheetApp.openById(sheetId);
  
  init(app);
  
  //houseKeeping first...
  houseKeeping();
  
  sites.forEach(function(v,i){
    //initialize the retry count
    retry = 1; 
    Logger.log("Pocessing: " + v.url);

    var sheet = app.getSheetByName(v.name);
    if(sheet == null) { //init
      app.insertSheet(v.name);
      sheet = app.getSheetByName(v.name);
      sheet.appendRow(["site", "time", "cost", "response code", "cpu user", "cpu system", "memory usage", "root disk usage"]);
      addLineChart(sheet);
    }
    
    //加上斷線通知及斷線連續測試max次
    doRequest(v.name, v.url, v.owner, sheet, function(){
      Logger.log("Finish of...(" + retry + "/" + max + ") " + v.url);
      retry = 1;
    });
    
  });
  
  Logger.log("Finish...");
};

function doRequest(site, url, owner, sheet, callback) {
  //Logger.log(">>>>site=%s, url:%s", site, url);
  var ts = new Date().getTime();
  try {
    var response = UrlFetchApp.fetch(url+'?ts=' + ts, {method:"GET"});
    var ts2 = new Date().getTime();
    var vo = JSON.parse(response);
    sheet.appendRow([site, new Date(), ts2 - ts, response.getResponseCode(), vo.cpu.p1, vo.cpu.p2, vo.mem.usage * 100, vo.disk[0].usage * 100]);
    callback();
  } catch (e) {
    Logger.log('Error:');
    Logger.log(e);
    retry ++;
    if(retry <= max) {
      Logger.log("Retry of %s/%s... Sleep(%s milesecond)", retry, max, (_sleep * retry));
      Utilities.sleep(_sleep * retry);
      doRequest(site, url, owner, sheet, callback);
    } else {
      Logger.log('Catch a connection error event... ');
      //Notify only micloud domain
      //Logger.log('Send mail to Admin...' + admin_notify_mail + '::::site=' +  site + ':::::max=' + max + ':::::e=' + e);
      var outhtml = Utilities.formatString(admin_notify_mail, site, url, max, e);
      cfg.options.htmlBody = outhtml;
      cfg.body = outhtml;
      //Mail notify
      GmailApp.sendEmail(owner, cfg.subject, cfg.body, cfg.options);
      //SMS notify
      sendSms(url);
    }
  }
}

/**
 * 清除舊記錄，保留10000筆記錄
 */
function houseKeeping(){
  var max = house_keep_max_rows;
  var app = SpreadsheetApp.openById(sheetId);
  sites.forEach(function(v,i){
    var sheet = app.getSheetByName(v.name);
    if(sheet)
    if(sheet.getLastRow() > max + 10) {
      Logger.log(v.name + '>>' + sheet.getLastRow() + ' is over max setting... will do house keep...');
      sheet.deleteRows(1, sheet.getLastRow() - max);
    } else {
      Logger.log('By pass housekeeping of ' + v.name + '>> current rows:' + sheet.getLastRow());
    }
  });
}

/**
 * Ref: https://developers.google.com/apps-script/articles/gmail_filter_sms
 */
function sendSms(site){
  
  Logger.log("Sending SMS for %s", calendarId);
  var cal = CalendarApp.getCalendarById(calendarId);
  var title = cfg.subject + ', Site Event: ' + site;
  var start = new Date();
  var end = new Date(new Date().getTime() + 10*1000);
  var desc = 'This is a monitor notify of ' + site + ', please check the online service!';
  var loc = 'MiCloud';
  
  var event = cal.createEvent(title, start, end, {
      description : desc,
      location : loc
  }).addSmsReminder(0);
  
}

function testSms() {
 sendSms('http://micloud.tw'); 
}
