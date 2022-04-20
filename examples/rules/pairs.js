import {getStats, retract, when, not, Observable, run} from "../../rule.js";

globalThis.getStats = getStats;

const numberpeople = 100;

class Person {
    constructor(config) {
        Object.assign(this,config);
    }
}
Person = Observable(Person);

class Combo extends Array {
    constructor(...args) {
        super();
        Object.assign(this,args);
    }
    equals(combo) {
        return combo.length===this.length && combo.every((a) => this.some((b) => deepEqual(a,b)));
    }
}
Combo = Observable(Combo);

when(({person1,person2}) => {
        return person1.name!==person2.name &&
            not(Combo(person1,person2))
    },{person1:Person,person2:Person})
    .then(function({person1,person2}) {
        if(person1.name==="name98") {
            setTimeout(() => {
                person1.name = "name100";
            },1000)
        }
        return this.justifies({person1,person2},new Combo(person1,person2))
    })
    .then(([combo]) => {
        console.log("A pair!",combo[0],combo[1]); //JSON.stringify(combo)
    });


for(let i=0;i<numberpeople;i++) {
    new Person({name:`name${i}`});
}
run();

/*setTimeout(() => {
    debugger;
    retract([...Person.watchlight.trackedInstances][0]);
},5000);*/