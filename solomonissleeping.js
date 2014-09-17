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
    var raw = []
    var napTotal=0, sleepTotal = 0
    var napCount=0, sleepCount = 0
    var summaryDate = this.date.format("dddd, MMM Do YYYY")

    this.sleeps.forEach(function (sleep) {
      if(sleep.sleep && sleep.woke){
        var start = new Date(sleep.sleep)
        var end = new Date(sleep.woke)
        var hours = start.getHours() % 12
        var minutes = start.getMinutes()
        var ampm = start.getHours() > 12 ? "pm" : "am"
        var diff = end - start;
        
        var sleepData = {start: hours + ":" + minutes + "" + ampm, duration: timeDiff(sleep.sleep, sleep.woke)}

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

}

if (Meteor.isServer) {

  Meteor.publish("sleep", function(){
    return Sleep.find({})
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
      console.log(id)
      return id;
    },
    wake: function () {
       Sleep.update({woke:null}, {$set: {woke: new Date()}})
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
