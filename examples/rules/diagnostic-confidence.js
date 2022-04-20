import {Observable, when, run} from "../../rule.js"

class Diagnosis {
    constructor({name,rule}) {
        this.name = name;
        this.rule = rule;
    }
}
Diagnosis = Observable(Diagnosis);

class TestResult {
    constructor({name,value}) {
        this.name = name;
        this.value = value;
    }
}
TestResult = Observable(TestResult);

when( function commonCold({testResult}) {
        return testResult.name==="temperature" && testResult.value > 99 && testResult.value < 101
    },
    {testResult:TestResult})
    .then(function({testResult}) {
        return {testResult,diagnosis:new Diagnosis({name:"Common Cold"})
        }})
    .then(function({testResult,diagnosis}) {
       this.justifies({testResult},diagnosis).withConfidence(.8)[0];
        console.log(`${JSON.stringify(diagnosis)} based on ${JSON.stringify(testResult)}`)
    });
when(function flu({testResult}) {
        return testResult.name==="temperature" && testResult.value > 99
    },
    {testResult:TestResult})
    .then(function({testResult}) { return {testResult,diagnosis:new Diagnosis({name:"Flu"}) }})
    .then(function({testResult,diagnosis})  {
        this.justifies({testResult},diagnosis).withConfidence(.6);
        console.log(`${JSON.stringify(diagnosis)} based on ${JSON.stringify(testResult)}`)
    });

when(function hypothermia({testResult}) {
    return testResult.name==="temperature" && testResult.value < 96 && testResult.value > 85
    },
    {testResult:TestResult})
    .then(function({testResult}) { return {testResult,diagnosis:new Diagnosis({name:"Hypothermia"}) }})
    .then(function({testResult,diagnosis}) {
        this.justifies({testResult},diagnosis).withConfidence(.6);
        console.log(`${JSON.stringify(diagnosis)} based on ${JSON.stringify(testResult)}`)
    });

new TestResult({name:"temperature",value:100}).withOptions({confidence:.9});

run();