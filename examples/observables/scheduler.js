import {Observable,observeOn,asyncScheduler} from "../../observable.js"

const observable = new Observable((observer) => {
    observer.next(1);
    observer.next(2);
    observer.next(3);
    observer.complete();
}).pipe(
    observeOn(asyncScheduler)
);

console.log('just before subscribe');
observable.subscribe({
    next(x) {
        console.log('got value ' + x);
    },
    error(err) {
        console.error('something wrong occurred: ' + err);
    },
    complete() {
        console.log('done');
    },
});
console.log('just after subscribe');