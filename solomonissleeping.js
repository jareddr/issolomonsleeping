if (Meteor.isClient) {
  var timer = new Deps.Dependency();
  var timerInterval

  function updateTime(){
    timer.changed()
  }

Template.data.helpers({
  dataDateFormat: function (date) {
    return moment(date).format("YYYY-MM-DD HH:mm:ss")
  }
});

  function timeDiff(t1, t2){
      var hours, minutes, seconds
      var time = (new Date(t2) - new Date(t1)) / 1000,
      hours = Math.floor(time / 60 / 60);
      time -= hours * 60 * 60;
      minutes = Math.floor(time / 60);
      time -= minutes * 60;
      seconds = Math.floor(time);

      if(hours < 1 && minutes < 1)
      {
        return seconds + " second" + (seconds==1 ? "" : "s")
      }
      else if (hours < 1){
        return minutes + " minute" + (minutes==1 ? "" : "s")
      }
      else{
        return hours + " hour" + (hours==1 ? "" : "s") + " & " + minutes + " minute" + (minutes==1 ? "" : "s")
      }
  }

  Template.summary.sleeping = function () {
    return Sleep.findOne({woke: null})
  }

  Template.manual_entry.rendered = function () {
    if(!this.rendered){
      this.rendered = true;
      $('#sleep-time').timepicker({
                minuteStep: 5,
                showInputs: false,
                disableFocus: true
            });
      $('#wake-time').timepicker({
                minuteStep: 5,
                showInputs: false,
                disableFocus: true
            });
    }

  };

  Template.summary.summary = function () {
    var napTimes = []
    var sleepTimes = []
    var raw = []
    var napTotal=0, sleepTotal = 0
    var napCount=0, sleepCount = 0
    var summaryDate = this.date.format("dddd, MMM Do YYYY")

    this.sleeps.forEach(function (sleep) {
      if(sleep.sleep && sleep.woke){
        var start = new Date(sleep.sleep)
        var end = new Date(sleep.woke)
        var hours = start.getHours() % 12
        var diff = end - start;
        
        var sleepData = {start: moment(sleep.sleep).format("h:mm a"), duration: timeDiff(sleep.sleep, sleep.woke)}

        raw.push({id: sleep._id, discard: sleep.discard, start: moment(sleep.sleep).format('M/D h:mm:ss a'), duration: timeDiff(sleep.sleep, sleep.woke)})

        //don't include discarded events
        if(sleep.discard){
          return
        }

        if(start.getHours() >= 7  && start.getHours() < 19){
          //don't count naps shorter than 10m
          if(diff<1000*60*10){
            return
          }
          napTimes.push(sleepData);
          napCount++
          napTotal += diff
        }
        else{
          sleepTimes.push(sleepData)
          sleepCount++
          sleepTotal += diff
        }
      }
    });
    return {raw:raw,date: summaryDate, naps: napTimes, napCount: napCount, napTotal: timeDiff(0,napTotal), sleeps: sleepTimes, sleepCount: sleepCount, sleepTotal: timeDiff(0,sleepTotal)};
  }

  Template.track.state = function () {
   if(Sleep.findOne({woke:null})){
        return "sleep"
      }
      else{
        return "wake"
      }
  };

  Template.track.asleep = function () {
   if(Sleep.findOne({woke:null})){
        return true
      }
      else{
        return false
      }
  };

  Template.track.created = function(){
    timerInterval = Meteor.setInterval(updateTime, 1000);
  }

  Template.track.destroyed = function () {
    Meteor.clearInterval(timerInterval)
  };

  Template.track.time = function () {
    timer.depend()
    var start, diff
    if(Sleep.findOne({woke:null})){
      start = Sleep.findOne({woke:null}).sleep
    }
    else if(Sleep.findOne({}) ){
      start = Sleep.findOne({}, {sort: {woke: -1}}).woke
    }

    if(start){
      var hours, minutes, seconds
      var time = (Date.now() - new Date(start)) / 1000,
      hours = Math.floor(time / 60 / 60);
      time -= hours * 60 * 60;
      minutes = Math.floor(time / 60);
      time -= minutes * 60;
      seconds = Math.floor(time);

      if(hours < 1 && minutes < 1)
      {
        return seconds + " second" + (seconds>1 ? "s" : "")
      }
      else if (hours < 1){
        return minutes + " minute" + (minutes>1 ? "s" : "")
      }
      else{
        return hours + " hour" + (hours>1 ? "s" : "") + " & " + minutes + " minute" + (minutes>1 ? "s" : "")
      }
  }
    
    return ""
  }

  Template.track.events({
    'click [rel="wake"]': function () {
      Meteor.call("sleep")
    },
    'click [rel="sleep"]': function () {
      Meteor.call("wake")
    }
  });

  Template.summary.events({
    'click [rel="discard"]': function () {
      Meteor.call("discard", this.id)
    },
    'click [rel="include"]': function () {
      Meteor.call("include", this.id)
    }    
  });

  function getDateTime(date, time_string){
    var time = time_string.split(/[: ]/),
        d1 = moment(date),
        hours,
        minutes
      if(time.length == 3){
        hours = parseInt(time[0])%12 + (time[2] == "AM" ? 0 : 12);
        minutes = parseInt(time[1])
      }

      d1.hours(hours)
      d1.minutes(minutes)
      //if earlier than 7am it happened the night of the next day
      if(hours < 7){
        //add one day
        d1.date(d1.date()+1)
      }
    
      return new Date(d1)
  }

  Template.manual_entry.events({
    'click [rel="add-event"]': function () {
      var d1 = getDateTime(this.date, $('#sleep-time').val())
      var d2 = getDateTime(this.date, $('#wake-time').val())

      if(d2-d1 < 0){
        alert('Wake time must come after sleep time.')
        return
      }

      Meteor.call("addEvent", d1, d2)
      // console.log(d1);
      // console.log(d2);
    }    
  });

}

if (Meteor.isServer) {

  Meteor.publish("sleep", function(){
    return Sleep.find({})
  })

  Meteor.publish("home", function(){
    return Sleep.find({discard:{$ne:1}}, {sort: {sleep:-1}, limit: 1})
  })

  Meteor.publish("summary", function(date1,date2){
    console.log(date1)
    return Sleep.find({sleep: {
        $gte: date1,
        $lt: date2,    
      }})
  })

  Meteor.methods({
    sleep: function () {
      id = Sleep.insert({sleep: new Date(), woke: null, discard: 0})
      return id;
    },   
    wake: function () {
       Sleep.update({woke:null}, {$set: {woke: new Date()}})
    },
    addEvent: function (d1,d2) {
      id = Sleep.insert({sleep: d1, woke: d2, discard: 0})
      return id;
    },
    discard: function(id){
      Sleep.update({_id:id}, {$set: {discard: 1}})
    },
    include: function(id){
      Sleep.update({_id:id}, {$set: {discard: 0}})
    }
  });

  Meteor.startup(function(){

    if(!Sleep.findOne()){
      var oldData = [
        {sleep: new Date('Sat Sep 13 2014 06:51:37 GMT-0700 (PDT)'), woke: new Date('Sat Sep 13 2014 07:25:05 GMT-0700 (PDT)')},
        {sleep: new Date('Sat Sep 13 2014 07:26:45 GMT-0700 (PDT)'), woke: new Date('Sat Sep 13 2014 07:31:55 GMT-0700 (PDT)')},
        {sleep: new Date('Sat Sep 13 2014 07:31:56 GMT-0700 (PDT)'), woke: new Date('Sat Sep 13 2014 07:31:57 GMT-0700 (PDT)')},
        {sleep: new Date('Sat Sep 13 2014 10:06:13 GMT-0700 (PDT)'), woke: new Date('Sat Sep 13 2014 11:19:30 GMT-0700 (PDT)')},
        {sleep: new Date('Thu Sep 11 2014 21:14:20 GMT-0700 (PDT)'), woke: new Date('Thu Sep 11 2014 21:42:05 GMT-0700 (PDT)')},
        {sleep: new Date('Thu Sep 11 2014 21:47:35 GMT-0700 (PDT)'), woke: new Date('Fri Sep 12 2014 03:03:52 GMT-0700 (PDT)')},
        {sleep: new Date('Fri Sep 12 2014 04:22:16 GMT-0700 (PDT)'), woke: new Date('Fri Sep 12 2014 05:44:57 GMT-0700 (PDT)')},
        {sleep: new Date('Fri Sep 12 2014 05:55:31 GMT-0700 (PDT)'), woke: new Date('Fri Sep 12 2014 05:55:44 GMT-0700 (PDT)')},
        {sleep: new Date('Fri Sep 12 2014 08:12:54 GMT-0700 (PDT)'), woke: new Date('Fri Sep 12 2014 08:44:12 GMT-0700 (PDT)')},
        {sleep: new Date('Fri Sep 12 2014 08:44:22 GMT-0700 (PDT)'), woke: new Date('Fri Sep 12 2014 08:44:25 GMT-0700 (PDT)')},
        {sleep: new Date('Fri Sep 12 2014 11:28:25 GMT-0700 (PDT)'), woke: new Date('Fri Sep 12 2014 12:44:15 GMT-0700 (PDT)')},
        {sleep: new Date('Fri Sep 12 2014 15:49:01 GMT-0700 (PDT)'), woke: new Date('Fri Sep 12 2014 16:25:06 GMT-0700 (PDT)')},
        {sleep: new Date('Fri Sep 12 2014 19:52:03 GMT-0700 (PDT)'), woke: new Date('Fri Sep 12 2014 22:45:03 GMT-0700 (PDT)')},
        {sleep: new Date('Fri Sep 12 2014 22:54:32 GMT-0700 (PDT)'), woke: new Date('Sat Sep 13 2014 04:29:10 GMT-0700 (PDT)')} 
      ]
      
      _.each(oldData, function(d){
        Sleep.insert(d)
      })    
    }
  })
}
