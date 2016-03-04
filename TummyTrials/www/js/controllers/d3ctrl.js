// d3ctrl.js Controller for creating the result visualization

'use strict';

(angular.module('d3', [])
  .factory('d3Service', ['$document', '$q', '$rootScope', 
    function($document, $q, $rootScope) {
      var d = $q.defer();
      function onScriptLoad() {
        // Load client in the browser
        $rootScope.$apply(function() { d.resolve(window.d3); });
      }
      // Create a script tag with d3 as the source
      // and call our onScriptLoad callback when it
      // has been loaded
      var scriptTag = $document[0].createElement('script');
      scriptTag.type = 'text/javascript'; 
      scriptTag.async = true;
      scriptTag.src = 'js/d3.v3.min.js';
      scriptTag.onreadystatechange = function () {
        if (this.readyState == 'complete') onScriptLoad();
      }
      scriptTag.onload = onScriptLoad;
 
      var s = $document[0].getElementsByTagName('body')[0];
      s.appendChild(scriptTag);
      return {
        d3: function() { return d.promise; }
      };
}])
);


(angular.module('d3.directives', ['d3','tummytrials.pasttrial1ctrl', 'tummytrials.vis'])
  .directive('resultVis', function(d3Service, $window, Vis) {

    return {
      restrict: 'EA',
      replace: true,
      scope: { 
        data: '=resultData',
        label: '@',
        onClick: '&',
        control: '='
      },
      link: function( scope, element, attrs) {
        scope.visdata = Vis;
        var A_text = scope.visdata.A_text;
        var B_text = scope.visdata.B_text;

        d3Service.d3().then(function(d3) {
          // counter for number of datapoints
          var xcount = null;

          var parseDate = d3.time.format("%a, %b %e %Y").parse;
          scope.data.forEach(function(d) {
            d.date = parseDate(d.date);
            xcount += 1;
          });

          var margin = {top: 20, right: 20, bottom: 50, left: 70},
              width = 350 - margin.left - margin.right,
              height = 320 - margin.top - margin.bottom;

          var color = d3.scale.ordinal()
                        .domain([0,1])
                        .range(['#FFA70F', '#0F85FF']);

          var circleR = 9;

          var yscale = d3.scale.linear()
                          .domain([0,8])
                          .range([height,0]);
          var xscale = d3.scale.ordinal()
                          .domain(scope.data.map(function(d) { return d.condition; }))
                          .rangeRoundBands([0,width]);

          // Define the axes
          var xAxis = d3.svg.axis()
              .scale(xscale)
              .orient("bottom")
              .tickFormat(function (d) {
                var mapper = {
                  0 : A_text,
                  1 : B_text
                }
                return mapper[d]
              });

          var yAxis = d3.svg.axis()
              .scale(yscale)
              .orient("left")
              .ticks(9)
              .tickFormat(function (d) {
                var mapper = {
                  0 : "No report",
                  1 : "Missing data",
                  2 : "Not at all",
                  3 : "Slightly",        
                  4 : "Mildly",
                  5 : "Moderately",
                  6 : "Severely",
                  7 : "Very severely",
                  8 : "Extremely"
                }
                return mapper[d]
              });

          // Add the svg canvas
          var svg = d3.select(element[0])
            .append('svg')
            .style('width', '100%')
              .attr("height", height + margin.top + margin.bottom)
            .append("g")
              .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

          // remove all previous items before render
          svg.selectAll('*').remove();

          // Add the X Axis
          svg.append("g")
              .attr("class", "x axis")
              .attr("transform", "translate(0," + height + ")")
              .call(xAxis);
            // .append("text")
            //   .attr("y", -7)
            //   .attr("class","label")
            //   .attr("transform", "translate(" + width + " ,0)")
            //   .style("text-anchor", "end")
            //   .text("Condition");

          // Add the Y Axis
          svg.append("g")
              .attr("class", "y axis")
              .call(yAxis);
            // .append("text")
            //   .attr("transform", "rotate(-90)")
            //   .attr("y", 7)
            //   .attr("dy", ".71em")
            //   .style("text-anchor", "end")
            //   .text("Severity");

          var groups = {};
          var discreteTo = (circleR * 2) / (yscale.range()[0] / yscale.domain()[1]);
          scope.data.forEach (function(datum) {
              var g = Math.floor (datum.severity / discreteTo);
              var cat = datum.condition;
              var ref = cat+"-"+g;
              if (!groups[ref]) { groups[ref] = 0; }
              datum.groupIndex = groups[ref];
              datum.discy = yscale (g * discreteTo);  // discrete.
              groups[ref]++;
          });
          scope.data.forEach (function(datum) {
              var cat = datum.condition;
              var g = Math.floor (datum.severity / discreteTo);
              var ref = cat+"-"+g;
              datum.offset = datum.groupIndex - ((groups[ref] - 1) / 2);
          });

          svg.selectAll("circle").data(scope.data)
          .enter()
          .append("circle")
            .attr("cx", function(d) { return (margin.left - circleR/2 + 1)  + xscale(d.condition) + (d.offset * (circleR * 3)); }) // change the "3" to vary spacing between points. 2 is 0 spacing since diameter.
            .attr("r", circleR)
            .attr("cy", function(d) { return d.discy - circleR; })
            .style ("fill", function(d) { 
                if(d.severity > 1){
                  return color(d.condition); 
                } else if(d.severity == 0 || d.severity == 1){
                  return "grey";
                }

              })
          .on("click", function(d, i){return scope.onClick({data_pt: d});});



          // Animating the vis for the time line view
          scope.control.updateVis = function(){

            Vis.view_title = "Time Line View";
            
            var xscale = d3.time.scale()
                            .range([0, width])
                            .domain(d3.extent(scope.data, function(d) { return d.date; }));

            var xAxis = d3.svg.axis()
                          .scale(xscale)
                          .ticks(xcount)
                          .orient("bottom");

            var svg = d3.selectAll('svg');

            svg.select(".x.axis") 
              .transition()
              .duration(750)
              .call(xAxis)
            .selectAll("text")
              .attr("transform", "rotate(-65)")
              .attr("x", -7)
              .attr("y", 0)
              .style("text-anchor", "end");

            svg.selectAll("circle")
                    .transition()
                    .attr("cx", function(d){
                      return xscale(d.date); 
                    })
                    .duration(750);

          //end updateVis function
          };

          // Animating the vis back to the original view
          scope.control.revertVis = function(){
            
            Vis.view_title = "Trend View";

            var xscale = d3.scale.ordinal()
                            .domain([0,1])
                            .rangeRoundBands([0,width]);

            var xAxis = d3.svg.axis()
                          .scale(xscale)
                          .orient("bottom")
                          .tickFormat(function (d) {
                            var mapper = {
                              0 : A_text,
                              1 : B_text
                            }
                            return mapper[d]
                          });

            var svg = d3.selectAll('svg');

            svg.select(".x.axis") 
              .transition()
              .duration(750)
              .call(xAxis);

            svg.selectAll("circle")
                .transition()
                .attr("cx", function(d){
                   return (margin.left - circleR/2 + 1)  + xscale(d.condition) + (d.offset * (circleR * 3)); 
                }) 
            .duration(750);
          // end revertVis function    
          };  
        // end d3 service
        });
      // end link
      }
      }
  })
);