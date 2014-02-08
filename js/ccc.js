/*
 * See http://www.nextbus.com/xmlFeedDocs/NextBusXMLFeed.pdf
 */

/*
 * One bus stop.
 */
var Stop = Backbone.Model.extend({
});

/*
 * A bus route has many stops.
 */
var Route = Backbone.Model.extend({
});


var Stops = Backbone.Collection.extend({
  model: Stop
});
var Routes = Backbone.Collection.extend({
  model: Route
});

var RouteView = Backbone.View.extend({
  tagName: "section",
  className: "route",
  template: _.template($('#template_route').html()),
  initialize: function() {
    this.listenTo(this.model, "change", this.render);
    this.$el.attr('data-tag', this.model.get('tag'));
    this.$el.attr('style', 'background-color:#'+this.model.get('color')+';color:#'+this.model.get('oppositeColor'));
    if (this.model.get('oppositeColor') === '000000') {
      this.$el.addClass('light');
    } else {
      this.$el.addClass('dark');
    }
  },
  render: function() {
    this.$el.html(this.template({route: this.model}));
    return this;
  }
});

var getRoutes = function(routeName) {
  $.ajax({
    method: 'GET',
    url: 'http://webservices.nextbus.com/service/publicXMLFeed',
    data: {
      command: 'routeConfig',
      a: routeName
    },
    dataType: 'xml',
    success: function(response) {
      $(response).find('route').each(function() {
        var $route = $(this);
        var stops = [];
        $route.find('stop').each(function() {
          var $stop = $(this);
          var stop = new Stop({
            id: $stop.attr('tag'),
            tag: $stop.attr('tag'),
            title: $stop.attr('title'),
            stopId: $stop.attr('stopId'),
            stopStr: $route.attr('tag') + "|" + $stop.attr('tag')
          });
          stops.push(stop);
          allStops.add(stop);
        });
        var route = new Route({
          id: $route.attr('tag'),
          tag: $route.attr('tag'),
          title: $route.attr('title'),
          color: $route.attr('color'),
          oppositeColor: $route.attr('oppositeColor'),
          stops: new Stops(stops)
        });
        allRoutes.add(route);
      });

      $(document).ready(function() {
        allRoutes.each(function(r) {
          $('body').append(new RouteView({model: r}).render().el);
        });
        getAllPredictions(routeName);
        $('button.refresh').on('click', function() { getAllPredictions(routeName); });
      });
    }
  });
};
var getAllPredictions = function(routeName) {
  var all = allStops.map(function(s) { return s.get('stopStr'); });
  var i = 0;
  var n = all.length;
  while (i < n) {
    var chunk = all.slice(i, i += 150);
    setTimeout(function() { getPredictions(routeName, chunk); }, 10);
  }
};
var getPredictions = function(routeName, stops) {
  $('.refresh').addClass('in-progress');
  $.ajax({
    method: 'GET',
    url: 'http://webservices.nextbus.com/service/publicXMLFeed',
    data: {
      command: 'predictionsForMultiStops',
      a: routeName,
      stops: stops
    },
    traditional: true, // do not append "[]" to the stops param name
    dataType: 'xml',
    success: function(response) {
      var template = _.template($('#template_prediction').html());
      $(response).find('predictions').each(function() {
        var $predictions = $(this);
        var p = [];
        $predictions.find('prediction').each(function() {
          var $prediction = $(this);
          p.push(template({prediction: {minutes: $prediction.attr('minutes')}}));
          if (p.length == 3) { return false; }
        });
        var $el = $('.route[data-tag=' + $predictions.attr('routeTag') + '] .stop[data-tag=' + $predictions.attr('stopTag') + ']');
        $el.find('.predictions').html(p.join(''));
      });
    },
    complete: function() {
      $('.refresh').removeClass('in-progress');
    }
  });
};

allRoutes = new Routes();
allStops = new Stops();
getRoutes('charm-city');

