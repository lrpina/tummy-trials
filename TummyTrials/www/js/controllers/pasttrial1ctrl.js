// Proposed data structure for consumption by the vis:
// "symptoms": [{
//     "symptom": name of symptom,
//     "date": readable date,
//     "condition": A/B + text,
//     "severity": num/missing
//     "compliance": yes/no
// }, ...
// ]
// on second thought, use severity to overload compliance. 
// if, complied, then a positive number, else -2, if complied and no score, -1
// if compliance is true, but no score reported, does that mean no compliance?
// "symptoms": [{
//     "symptom": name of symptom,
//          "date": [condition, score]    
// }, ...
// ]

// Things needed for the results summary
// Evidence : categorization of p-value into no evidence, possible evidence, or strong evidence
// Symptom : name of the symptom (results are divided per symptom)
// Change : does it improve or worsen the symptom
// Trigger : name of trigger (common across symptoms)

'use strict';

(angular.module('tummytrials.pasttrial1ctrl', 
                ['tummytrials.text', 'ionic', 'tummytrials.experiments', 
                 'd3', 'tummytrials.vis', 'd3.directives', 
                 'tummytrials.studyfmt','tummytrials.currentctrl', 'tummytrials.lc'])

.controller('PastTrial1Ctrl', function($scope, $stateParams, $ionicPopup, $timeout, Vis,
                                        Text, Experiments, LC, d3Service, $window) {
    Text.all_p()
    .then(function(text) {
        $scope.text = text;
        return Experiments.publish_p($scope);
    })
    .then(function(_) {
        var study = $scope.study_previous[$stateParams.studyIndex];
        var text = $scope.text;
        $scope.study_past1 = study;

        // variables for displaying test in the results

        $scope.start_date_md = LC.datemd(new Date(study.start_time * 1000));

        var end_date = new Date(study.end_time * 1000); // This is first day *after* the trial
        end_date.setDate(end_date.getDate() - 1); // This is last day of the trial
        $scope.end_date_md = LC.datemd(end_date);     

        $scope.st_trigger = study.trigger;
        $scope.st_symptom = study.symptoms;
        $scope.st_status = study.status;
        $scope.st_comment = study.comment;


        // injecting Vis service
        $scope.visdata = Vis;
        //gather all data needed for report + vis 
        var cur = study;
        $scope.exp_id = cur.id;
        $scope.nm = name;

        //Get the duration of the experiment
        var dur = cur.end_time - cur.start_time;
        $scope.duration = new Date(dur * 1000); 
        $scope.duration_readable = LC.dateonly($scope.duration);

        var report = [];
        var days = []; // Array for filling the calendar widget 
        var d = []; // Temp array 
        var rand = cur.abstring.split(''); // Array for the randomization of conditions
        var score = null;
        var sym_num = cur.symptoms.length; // number of symptoms being logged
        var sym_name = null;
        var sym_sym = [];
        var sym_data = {};
        var res_all = {};

        //Statement summary of the result
        var res_desc = text.results.summary;
        var trig = cur.trigger;

        // checking if trigger has Eating or Drinking in its text
        // 'Drinking Caffeine' becomes 'Caffeine'
        if(trig.indexOf('Eating') != -1){
            trig = trig.replace('Eating ', '');
        } else if(trig.indexOf('Drinking') != -1){
            trig = trig.replace('Drinking ', '');
        }
        $scope.trig = trig;

        // iterating over all the symptoms
        for(var a = 0; a < sym_num; a++){
            sym_name = cur.symptoms[a];
                // iterating over all the days of the trial
                for(var i=0; i < $scope.duration_readable; i++){
                    var day = new Date((cur.start_time + (86400 * i)) * 1000);  //86400 adds 1 day
                    var dt = LC.fulldate(day);
                    var score = null;
                    // d.push(dt);
                    d.push(rand[i]);
                    sym_data["index"] = (i+1);
                    if(rand[i] == "A"){
                        sym_data["condition"] = 0;
                    } 
                    if(rand[i] == "B"){
                        sym_data["condition"] = 1;
                    } 

                    if(typeof(cur.reports[i]) == "object"){
                        //report logged if there is an object and symptom scores exists
                        if(cur.reports[i].breakfast_compliance == true && typeof(cur.reports[i].symptom_scores) == "object"){
                            score = cur.reports[i].symptom_scores[a].score;
                            // off setting the symptom score by 2 for the result vis.
                            sym_data["severity"] = score + 2;
                        // if compliance is true but score not reported
                        } else if(cur.reports[i].breakfast_compliance == true && typeof(cur.reports[i].symptom_scores) != "object"){
                            sym_data["severity"] = 1;
                        // negative compliance
                        } else {
                            // print no compliance
                            sym_data["severity"] = 0;
                        }
                    // no response at all
                    } else {
                        sym_data["severity"] = 0;
                    }
                    // Using the date as the key, store the condition and the score for each day
                    sym_data["date"] = dt;

                    res_desc = res_desc.replace('{SYMPTOM}', sym_name);
                    res_desc = res_desc.replace('{TRIGGER}', trig);
                    sym_data["summary"] = res_desc;
                    sym_sym.push(sym_data);
                    d = [];
                    score = null;
                    sym_data = {};
                    // need to reset the description text since {SYMPTOM} no longer exists after first pass
                    res_desc = text.results.summary;
                }
                $scope.sym_syma = sym_sym;
                res_all[sym_name] = sym_sym; 
                sym_sym = [];
        }
        $scope.visdata = res_all;

        $scope.$watch(Vis.view_title, function(newVal, oldVal, scope){
            if(newVal){
                scope.view_title = newVal;
            }
        })
        
        //Figuring out the message for the day (avoid/consume the trigger)
            var A_text, B_text, h_URL;
            var text_loc = $scope.text.setup3.triggers; //Getting the text from JSON for each trigger

            for(i = 0; i < text_loc.length; i ++){
                if(cur.trigger == text_loc[i].trigger){ //Checking which trigger is being tested in the current experiment                    
                    A_text = text_loc[i].phrase_plus;
                    B_text = text_loc[i].phrase_minus;
                    h_URL = text_loc[i].uisref; // URL for help deciding what to eat for the condition
                }
            }
            $scope.A_text = A_text;
            $scope.B_text = B_text;
            $scope.help_URL = h_URL;

            Vis.A_text = A_text;
            Vis.B_text = B_text;

        // onclick function for the visualization
        $scope.d3OnClick = function(data_pt){

            var cond_text = null;
                if(data_pt.condition == 0){
                    cond_text = A_text;
                }
                if(data_pt.condition == 1){
                    cond_text = B_text;
                }

            var severity_text = null;
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
                };
            severity_text = mapper[data_pt.severity];

            //trimming date to be more readable
            var date_trimmed = JSON.stringify(data_pt.date);
            date_trimmed = date_trimmed.replace('T08:00:00.000Z', '');
            date_trimmed = date_trimmed.replace(/"/g, '');

            $scope.alert_message = "Condition : " + cond_text + "<br/>" + "Severity : " + severity_text + "<br/>" + 
                          "Date : " + date_trimmed;

            $scope.alert_title = "Details for the day"

               var alertPopup = $ionicPopup.alert({
                 title: $scope.alert_title,
                 template: $scope.alert_message
               });

               alertPopup.then(function(res) {
               });
             // };
        //end onClick
        };

        $scope.resultVisControl = {};

    });
})
// module end
);