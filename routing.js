if (Meteor.isClient) {

	Router.configure({
		//layoutTemplate: 'content',
		loadingTemplate: 'loading',
		before: function(){
			//NProgress.start()
		},
		after: function(){
			//NProgress.done()
			//GAnalytics.pageview()
		}
	});

	Router.onBeforeAction('loading')

	Router.map(function() {
	  	this.route('track', {path: '/', waitOn: function(){ return Meteor.subscribe("sleep")}})
	  	this.route('loading', {path: '/loading', waitOn: function(){ return Meteor.subscribe("sleep")}})
		this.route('data', {
			path: '/data',
			waitOn: function(){
				return Meteor.subscribe("sleep")
			},
			data: function(){
				return {sleeps: Sleep.find({discard:{$ne:1}}, {sort: {sleep:1}}).fetch()}
			}
		})
		this.route('summary', { 
		  path: '/summary/:year?/:month?/:day?',
		  waitOn: function() { 
		  	var year=this.params.year,month=this.params.month,day=this.params.day,day2;
	  	    if(!this.params.year || !this.params.month || !this.params.day){
		      var now = new Date()
		      year = now.getFullYear()
		      month = now.getMonth()+1
		      day = now.getDate()
		    }

		    day2 = parseInt(day) + 1;
		    
		    if(month < 10){
		      month = "0"+month
		    }
		    if(day < 10){
		      day = "0"+day
		    }
		    if(day2 < 10){
		      day2 = "0"+day2
		    }
	
      		this.date1 = new Date(year + "-" + month + "-" + day + "T14:00:00.000Z")
        	this.date2 = new Date(year + "-" + month + "-" + day2 + "T14:00:00.000Z")    
		  	return Meteor.subscribe("summary", this.date1,this.date2) 
		 },
		  data: function() {

		  	var date = this.params.day ? moment(this.params.year+"/"+this.params.month+"/"+this.params.day, "YYYY/MM/DD") : moment()
		  	return {
		  		nextDay: {year: date.add(1, "day").format("YYYY"), month: date.format("M"), day: date.format("D")} ,
		  		previousDay: {year: date.add(-2, "day").format("YYYY"), month: date.format("M"), day: date.format("D")},
		  		date:date.add(1, "day"),
		  		sleeps: Sleep.find({sleep: {$gte: this.date1, $lt: this.date2}}, {sort: {sleep:1}}) 
		  	} 
		  } 
		});
	})
	
}