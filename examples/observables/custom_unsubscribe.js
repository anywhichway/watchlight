import {Observable} from "../../observable.js"

const observable = new Observable(function subscribe(subscriber) {
    // Keep track of the interval resource
    const intervalId = setInterval(() => {
        subscriber.next('hi');
    }, 1000);

    // Provide a way of canceling and disposing the interval resource
    return function unsubscribe() {
        console.log("Sorry you don't want to hear from me any more :-(.")
        clearInterval(intervalId);
    };
});

console.log('just before subscribe');
const subscription = observable.subscribe({
    next(x) { console.log(x); },
    error(err) { console.error('something wrong occurred: ' + err); },
    complete() { console.log('done'); }
});
console.log('just after subscribe');

setTimeout(() => {
    subscription.unsubscribe()
},5000)