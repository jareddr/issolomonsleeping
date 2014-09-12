if (Meteor.isClient) {
  var timer = new Deps.Dependency();
  var timerInterval
  var sleepSubscription = Meteor.subscribe("sleep")

  function updateTime(){
    timer.changed()
  }

  Template.main.state = function () {
   if(Sleep.findOne({woke:null})){
        return "sleep"
      }
      else{
        return "wake"
      }
  };

  Template.main.asleep = function () {
   if(Sleep.findOne({woke:null})){
        return true
      }
      else{
        return false
      }
  };

  Template.main.ready = function() {
    return sleepSubscription.ready()
  }

  Template.main.created = function(){
    timerInterval = Meteor.setInterval(updateTime, 1000);
  }

  Template.main.destroyed = function () {
    Meteor.clearInterval(timerInterval)
  };

  Template.main.time = function () {
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

  Template.main.events({
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

  Metoer.publish("summary", function(year, month, day){
    return Sleep.find({sleep: {
        $gte: new Date(year + "-" + month + "-" + day + "T07:00:00.000Z"),
        $lt: new Date(year + "-" + month + "-" + day+1 + "T07:00:00.000Z"),    
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
