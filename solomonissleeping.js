if (Meteor.isClient) {
  var timer = new Deps.Dependency();
  var timerInterval

  function updateTime(){
    timer.changed()
  }

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

  Template.summary.summary = function () {
    var napTimes = []
    var sleepTimes = []
    var napTotal=0, sleepTotal = 0
    var napCount=0, sleepCount = 0
    var summaryDate = "Today"
    var dayLookup = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    var monthLookup = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
    var endingLookup = ["th", "st", "nd", "rd", "th", "th", "th", "th", "th", "th", "th", "th", "th", "th", "th", "th", "th", "th", "th", "th", "th", "st", "nd", "rd", "th", "th", "th", "th", "th", "th", "th", "st", "nd", "rd", "th", "th", "th", "th", "th", "th", "th"]

    if(this.day && this.month && this.year){
      var d = new Date(this.year + "-" + this.month + "-" + this.day + "T07:00:00.000Z")
      summaryDate = dayLookup[d.getDay()] + ",  " + monthLookup[d.getMonth()] + " " + d.getDate() + endingLookup[d.getDate()] 
    }
    

    this.sleeps.forEach(function (sleep) {
      if(sleep.sleep && sleep.woke){
        var start = new Date(sleep.sleep)
        var end = new Date(sleep.woke)
        var hours = start.getHours() % 12
        var minutes = start.getMinutes()
        var ampm = start.getHours() > 12 ? "pm" : "am"
        var diff = end - start;
        
        var sleepData = {start: hours + ":" + minutes + " " + ampm, duration: timeDiff(sleep.sleep, sleep.woke)}
        
        if(start.getHours() >= 7  && start.getHours() < 19){
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
    return {date: summaryDate, naps: napTimes, napCount: napCount, napTotal: timeDiff(0,napTotal), sleeps: sleepTimes, sleepCount: sleepCount, sleepTotal: timeDiff(0,sleepTotal)};
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
}

if (Meteor.isServer) {

  Meteor.publish("sleep", function(){
    return Sleep.find({})
  })

  Meteor.publish("summary", function(d){
    if(!d.year || !d.month || !d.day){
      var now = new Date()
      d = {}
      d.year = now.getFullYear()
      d.month = now.getMonth()+1
      d.day = now.getDate()
    }
    d.day2 = parseInt(d.day) + 1;
    if(d.month < 10){
      d.month = "0"+d.month
    }
    if(d.day < 10){
      d.day = "0"+d.day
    }
    if(d.day2 < 10){
      d.day2 = "0"+d.day2
    }
    return Sleep.find({sleep: {
        $gte: new Date(d.year + "-" + d.month + "-" + d.day + "T07:00:00.000Z"),
        $lt: new Date(d.year + "-" + d.month + "-" + d.day2 + "T07:00:00.000Z"),    
      }})
  })

  Meteor.methods({
    sleep: function () {
      id = Sleep.insert({sleep: new Date(), woke: null})
      console.log(id)
      return id;
    },
    wake: function () {
       Sleep.update({woke:null}, {$set: {woke: new Date()}})
    }
  });
}
