# apps-script-monitor

Author: simonsu.mail@gmail.com

## Server installation

In server side, we should install a daemon that run on port 1337 for present the cpu, memory, disk usages information.

```
curl https://raw.githubusercontent.com/micloud/nomon/master/install.sh | bash
```

## Create monitor script

* Create a google sheet
* Update the following informations

```
me = 'your@gmail.com',
calendarId = 'your-calendar-id@group.calendar.google.com',
sheetId = 'your-sheet-id',
cfg = {
  recipient: 'who-want-to-receive@gmail.com',
  subject: 'Notify Title', 
  ...}
```

  * me: Admin email address for receive error message
  * calendarId: The calendar ID. If binding the SMS notification to calendar, you can receive the SMS notify.
  * sheetId: The google spreadsheet id.
  * cfg.recipient: Who want to receive the admin notify, list the email spread by comma here.
  * cfg.subject: The notify email title.
  * 
* Setup the schedule from AppScript console.
* Setup the monitor list: Create a sheet tab named "Config", and write the monitor servers by the following format
  * name: This is the name of script to create a tab for collect the monitor data
  * url: The server monitor url
  * owner: The notification receivers.
