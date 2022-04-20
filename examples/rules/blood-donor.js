import {getStats, retract, when, Observable, run} from "../../rule.js";

globalThis.getStats = getStats;

// translated from https://en.wikipedia.org/wiki/Jess_(programming_language)#Code_examples

class BloodDonor {
    constructor({name,type}) {
        this.name = name;
        this.type = type;
    }
}
BloodDonor = Observable(BloodDonor,{partials:true});

when(function sameTypeButNotSelf({donor1,donor2}) {
    return donor2.type === donor1.type && donor2.name !== donor1.name;
},{donor1:BloodDonor,donor2:BloodDonor})
    .then(({donor1,donor2}) => {
        console.log(`donor ${donor1.name} can give blood to ${donor2.name}`)
    })
when(function OtoOthersButNotSelf({donor1,donor2}) {
    return donor1.type === "O" && donor2.type !== donor1.type && donor2.name !== donor1.name;
},{donor1:BloodDonor,donor2:BloodDonor})
    .then(({donor1,donor2}) => {
        console.log(`donor ${donor1.name} can give blood to ${donor2.name}`)
    })
when(function AorBtoABButNotSelf({donor1,donor2}) {
    return (donor1.type === "A" || donor1.type === "B") && donor2.type === "AB" && donor2.name !== donor1.name;
},{donor1:BloodDonor,donor2:BloodDonor})
    .then(({donor1,donor2}) => {
        console.log(`donor ${donor1.name} can give blood to ${donor2.name}`);
    })

new BloodDonor({name:"Alice",type:"A"});
new BloodDonor({name:"Agatha",type:"A"});
new BloodDonor({name:"Bob",type:"B"});
new BloodDonor({name:"Barbara",type:"B"});
new BloodDonor({name:"Jess",type:"AB"});
new BloodDonor({name:"Karen",type:"AB"});
new BloodDonor({name:"Onan",type:"O"});
new BloodDonor({name:"Osbert",type:"O"});

run();

//run({trace:{stop:true}});



