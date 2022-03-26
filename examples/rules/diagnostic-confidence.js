import {assert, reactive, run, whilst} from "../../watchlight.js"

class Diagnosis {
    constructor({name,rule}) {
        this.name = name;
        this.rule = rule;
    }
}
Diagnosis = reactive(Diagnosis);

class TestResult {
    constructor({name,value}) {
        this.name = name;
        this.value = value;
    }
}
TestResult = reactive(TestResult);

const functionToString = (f) => {
    return (f+"").replaceAll(/\\r\\n/,"")
}

const commonCold = ({testResult})=>testResult.name==="temperature" && testResult.value > 99 && testResult.value < 101;
whilst(commonCold,
    ({testResult}) => { return {testResult,diagnosis:Diagnosis({name:"Common Cold",rule:commonCold+""})}},
    {testResult:TestResult})
    .withOptions({confidence:.8})
    .then(({testResult,diagnosis}) => {
        console.log(`${JSON.stringify(diagnosis)} based on ${JSON.stringify(testResult)}`)
    });
const flu = ({testResult}) => testResult.name==="temperature" && testResult.value > 99;
whilst(flu,
    ({testResult}) => { return {testResult,diagnosis:Diagnosis({name:"Flu"})}},
    {testResult:TestResult})
    .withOptions({confidence:.6})
    .then(({testResult,diagnosis}) => {
        console.log(`${JSON.stringify(diagnosis)} based on ${JSON.stringify(testResult)}`)
    });

whilst(({testResult}) => {
        return testResult.name==="temperature" && testResult.value < 96 && testResult.value > 85
    },
    ({testResult}) => { return {testResult,diagnosis:Diagnosis({name:"Hypothermia"})}},
    {testResult:TestResult})
    .withOptions({confidence:.9})
    .then(({testResult,diagnosis}) => {
        console.log(`${JSON.stringify(diagnosis)} based on ${JSON.stringify(testResult)}`)
    });

assert(TestResult({name:"temperature",value:100}),{confidence:.9});

run({trace:{run:true}});
