import {when,not,getStats,Observable,run} from "../../rule.js";

globalThis.getStats = getStats;

/* Using rules to compute Fibonacci numbers is not very efficient; however, it is a good may to stress rules across
a large number of fact combinations. Generating a Fibonacci sequence of 100 creates 1,000,000 combinations of
objects for the compute function below.
 */

const sequenceSize = 100;

const sequence = [];


/*function Fibonacci({sequence,value=-1}) {
    this.sequence = sequence;
    this.value = value;
}*/
class Fibonacci {
    constructor({sequence,value=-1}) {
        this.sequence = sequence;
        this.value = value;
    }
}
Fibonacci = Observable(Fibonacci)

when(function recurse({f}) {
    return f.value === -1 && not(Fibonacci({sequence:1}))
},{f:Fibonacci},{priority:10})
    .then(({f}) => {
        new Fibonacci({sequence:f.sequence - 1})
    });

when(function bootstrap({f}) {
    return f.value === -1 && (f.sequence === 1 || f.sequence === 2)
},{f:Fibonacci})
    .then(({f}) => {
        f.value = 1;
        sequence[f.sequence-1] = f.value;
    });

when(function calculate({f1,f2,f3}) {
    return f1.value!==-1 && f2.sequence === f1.sequence + 1 && f2.value!==-1 && f3.sequence === f2.sequence + 1 && f3.value===-1
},{f1:Fibonacci,f2:Fibonacci,f3:Fibonacci})
    .then(({f1,f2,f3}) => {
        f3.value = f1.value + f2.value;
        sequence[f3.sequence-1] = f3.value;
        if(sequence.length===sequenceSize) {
            console.log(sequence);
            run(false);
            console.log(getStats());
        }
    });

new Fibonacci({sequence:sequenceSize});

run();
