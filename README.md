<div style="position:fixed;min-width:100%;opacity:1;background:white;margin-bottom:0px;height:1.5em"><a href="https://watchlight.dev">watchlight.dev</a> v1.1.2 beta</div>
<div id="TOC" style="position:fixed;top:2em;max-height:97%;height:97%;opacity:1;background:white">
   <div id="header" style="font-weight:bold;margin-top:0px">
     &nbsp;<span id="toggle-button" style="display:none;float:right;font-weight:bold;margin-top:0px">&lt;&lt;</span>
   </div>
   <div class="toc" style="border:1px solid grey;margin-right:5px;border-radius:5px;overflow-x:hidden;overflow-y:auto;background:whitesmoke">
   </div>
</div>
<div id="content" style="float:right;padding-top:0px;max-height:100vh;overflow:auto;opacity:1">

## Introduction to Watchlight

A light-weight, comprehensive, reactive framework for business logic and when things change.

`Watchlight` provides a range of approaches to support reactive programming beyond the DOM and user interface with a
light-weight JavaScript module (14K minified, 4.6K gzipped).

* <a href="#event-listeners">Event listeners</a> on any reactive object via `addEventListener`.
* <a href="#observers">Observers</a> via functions wrapping reactive objects,
  e.g. `observer(() => console.log(myObject.name))`
  will log the `name` every time it changes.
* A range of `Observable` capability similar to `RxJs`.
* <a href="#inference-rules">Inference rules</a> similar to  <a href="https://www.drools.org/">Drools</a> or
  <a href="https://www.npmjs.com/package/rools">Rools</a> and modeled after the `Promise` paradigm.
* <a href="#spreadsheet">Spreadsheets</a> ... no reactive library would be complete without them.

The spreadsheet and rules are provided as separate files, `rule.js` and `./sheet.js` which are not included in 
the 4.5K size stated above. They are XXX and YYY respectively.

`Watchlight` does not use any intermediate languages or transpilation; hence, you can debug all of your code as written
using a standard JavaScript debugger.

## Installation

`Watchlight` is provided as a JavaScript module. It can be loaded directly in a modern browser or used directly in
<a href="https://nodejs.dev/">NodeJS</a>.

```shell
npm install watchlight
```

The repository is
at <div><a href="https://github.com/anywhichway/watchlight">https://github.com/anywhichway/watchlight</a></div>

Transpiling and minifying is left to the developer using the library.

## Using The Examples

There are examples in the <a href="./examples" target="_tab">examples directory and sub-directories</a>. Most examples
can be run by both loading an HTML file and running the command `node examplefilename.js`. The HTML files just load the
same JavaScript files that are fed to NodeJS on the command line.

## Psuedo Classes

`Watchlight` makes extensive use of `Proxy` or other constructs around objects and functions you provide. These
constructs supplement the behavior of your functions and classes, but `instanceof` will only be true for your original
symbols, i.e. nothing will ever be an `instanceof` a psuedo-class.

The psuedo-classes include:

* Observable
* Observer
* Subscription
* Rule
* Partial
* Sheet
* Dimension
* Cell

## Observable Objects, Constructors and Functions

The core of `Watchlight` is the psuedo-class `Observable`. Observable objects are reactive, they drive application in
a non-procedural manner. They can have <a href="#event-listeners">event listeners and subscribers </a> attached, be the 
subject of <a href="#observers">observers</a>, and be referenced by <a href="#inference-rules">inference rules</a>.

When the properties of Observable objects contain sub-objects, the sub-objects are returned as reactive objects when
accessed.

If a class is made Observable and `observeInstances:true` is passed as an option, it will return 
an Observable instance when it is called to create a new instance.


### Reactive Object API

#### Observables

**`Observable Observable(target:object|function [, {global:boolean, observeInstances:boolean}])`**

Wraps target with a Proxy and makes it Observable, i.e. a subject of Subscriptions, Observers, and Rules.

Setting `global` to `true` when the type of the target is a `function` will make the function available in the `globalThis`
context.

Setting `observeInstances` to `true` will automatically make any instances created by a class constructor Observable. Note,
this will only work for classes defined using `class <className> {}`, not old style JavaScript classes.

There are actually some other options, but they are for internal use and remain un-documented for now.

Returns: Observable (Remember, this is a pseudo-class. It is a Proxy around the target.)

#### Observers

`Watchlight` supports many of the functions of [RxJs](https://rxjs.dev/), but is also supports a somewhat simpler 
reactive concepts, the Observer. Observers are functions that get invoked automatically every time
the properties on the Observeable objects they reference change in value. They are more powerful that event listeners
because they can operate across multiple objects.

Those familiar with `RxJs` can think of `observers` as functions that automatically subscribe to an `Observable` when the
`Observable` detects that the `observer` accesses some of its properties. What is super powerful about `Observer` is that
it will automatically subscribe across multiple `Observables`.

Observers are the cornerstone of the `watchlight` <a href="#spreadsheet">spreadsheet</a> functionality. A slimmed down
version is also used in the [Lightview reactive UI library](https://lightview.dev).

##### Observer Examples

```javascript
const user = Observable({name: "mary"});
const hello = Observer(() => {
    console.log("Hello", user.name);
})
user.name = "joe";
```

logs

```shell
Hello mary
Hello joe
```

Nested property access automatically creates child reactors, changes to which will invoke the observer so long as the
changes are made via navigation through the Observable `user`.

```javascript
const user = Observable({name: "mary", contactInfo: {phone: "555-555-5555"}});
Observer(() => {
    console.log(JSON.stringify(user)); // recursively accesses every property
})
user.contactInfo.phone = "999-999-9999";
```

logs

```shell
{"name":"mary","contactInfo":{"phone":"555-555-5555"}}
{"name":"mary","contactInfo":{"phone":"999-999-9999"}}
```

You can call an `Observer` directly:

```javascript
const user = Observable({name: "mary", contactInfo: {phone: "555-555-5555"}}),
    logUser = Observer(() => {
        console.log(JSON.stringify(user)); // recursively accesses every property
    })
logUser();
```

logs

```shell
{"name":"mary","contactInfo":{"phone":"555-555-5555"}}
{"name":"mary","contactInfo":{"phone":"555-555-5555"}}
```

#### Observer API

**`Observer Observer(aFunction:function [,thisArg:object,...args:any])`**

Creates an Observer from `aFunction` you provide. The Observer will be called any time the properties on the objects it
references change in value. You can also call the Observer directly like it was the original function.

Observers are indexed internally by name. Creating an observer from a function with the same name as a previous
observer will overwrite the old observer. Anonymous functions are not overwritten.

You can pass a default `thisArg` and `...args` when creating an `Observer`.

Synchronously invoked sub-functions that access Observable data will create reactive dependencies that can cause 
invocation of the Observer at a later time. Use `unobserve` to avoid creating a reactive dependency. Asynchronously 
invoked sub-functions, i.e. those inside `setTimeout` will not cause reactive dependencies.

```javascript
import {reactive, observer} from "../../watchlight.js";

const user = reactive({name: "mary"});
const hello = observer(() => {
    console.log("Hello", user.name);
})

const world = reactive({});
observer(function (message) {
    this.user = user.name
    console.log(message, user.name);
}, world, "Welcome to the world")
observer(() => {
    if (world.user) console.log(`${world.user} owns the world.`)
})

user.name = "joe";

hello();
```

logs

```shell
Hello mary
Welcome to the world mary
mary owns the world.
Hello joe
joe owns the world.
Welcome to the world joe
Hello joe
```

**`void observer.stop()`**

Stops `observer` from executing when the objects it references change.

**`void observer.start()`**

Restarts the `observer` so it will respond when the objects it references change.

**`Observer observer.withOptions( {onerror:function} )`**

`Observer` error handling defaults to re-throwing errors thrown by wrapped functions. This can be changed to swallow the
error by passing `{onerror:()=>{}}` or use the error as the value by passing `{onerror:(e) => e}`.

**`any unobserve( aFunction:function )`**

You can nest `unobserve` inside an observer if you do not want changes to a particular object or property to cause
invocation of the observer.

Functions wrapped in `unobserve` are transient and will get the `this` context of the enclosing observer so long as you
define them using `=>`.

Returns: The value returned by the function you provide.

`unobserve` is useful when you need to use arrays but do not want index modification or access to cause an observer to
be re-invoked or when you want to use JSON.stringify.

```javascript
import {reactive, observer, unobserve} from "../../watchlight.js";

const tasks = reactive([
    {name: "task1", duration: 2000},
    {name: "task2", duration: 3000},
    {name: "task3", duration: 1000},
    {name: "task4", duration: 2000}]);

const doTasks = observer(() => {
    const task = tasks.currentTask = unobserve(() => tasks.shift());
    if (task) {
        // complete the task in the defined duration
        setTimeout(() => task.complete = true, task.duration);
        // will access all properties
        console.log("doing:", unobserve(() => JSON.stringify(tasks.currentTask)));
        observer(() => {  // called whenever current task completion is changed
            if (tasks.currentTask?.complete) {
                // will access all properties
                console.log("completed:", unobserve(() => JSON.stringify(tasks.currentTask)));
                doTasks();
            }
        })
    } else {
        console.log("Waiting for more tasks ...");
        const interval = setInterval(() => {
            if (tasks.length > 0) { // poll for length change, not reactive since in setInterval
                clearInterval(interval);
                doTasks();
            }
        })
    }
})
setTimeout(() => tasks.push(reactive({name: "task5", duration: 2000})), 10000);
```

##### Subscriptions and Event Listeners

Reactive objects created using `Observable(target)` can dispatch event listeners similar to those used in web browsers.

Event listeners are added via `subscribe`. They can be revoked via `unsubscribe`. If the `target` supports
`addEventListener`, e.g. if you make a `DOMElement` Observable, then `addEventListener` is also supported. Listeners
are indexed internally based on their text representation; hence, if you plan to overwrite them,
you should not use functions that contain closure values and count on the functions being preserved as different event
handlers.

**`Subscription subscribe(subscription: function|string|ObservableEventDescriptor, target:Observable)`**

You will usually pass a function as the value for `subscription` when subscribing. The name of the function should be the event 
type you wish to subscribe to. If you pass an un-named function, it will be invoked for all events.

Passing a string for `subscription` is only useful for pipelined subscriptions and is covered in more detail elsewhere.

The function or string passed is actually just a shorthand for an `ObservableEventDescriptor` which has the surface
`{eventType: string, listener: function}`.

```javascript
class Person {
    constructor({name, age}) {
        this.name = name;
        this.age = age;
    }
}

Person = Observable(Person);
const joe = Person({name: "joe", age: 27}); // joe is a reactive object
subscribe(function change({target,property,value,oldValue}) {
    console.log(`${target.name}'s ${property} is changing from ${oldValue} to ${value}`)
},joe);
```

Functions can be made into Observables. When they are, you can subscribe to the invocation.

```javascript
function helloWorld() {
    console.log("Hello world!");
}
subscribe(function apply({target,thisArg,argsList}) {
    console.log(`${target.name} is about to execute`);
},helloWorld);
```

You may have noted from the above that subscriptions are notified prior to an activity occuring, this allows
the activity to be cancelled just like DOM events.

```javascript
subscribe(function change({target,property,value,oldValue,preventDefault}) {
    if(CURRENTUSER.name!==target.name) {
        event.preventDefault();
        alert(`You can only change your own name!`);
    }
},joe);
```

That's the basics, we cover more advanced use of Subscriptions later.

**`void observableInstance.addEventListener( eventType:string, listener:function, options:Object)`**

Only available if the target of the `observableInstance` supports `addEventListener` like a DOM Element.

Adds a `function` as an event listener on the `eventName`. The listener will receive an `ObservableEvent` when the
`eventName` occurs on the `observableInstance`, i.e. the listener has the signature `({event,....rest})`.

The `options` argument has the surface `{synchronous,once}`.

Returns: `void`. If you want chaining, use `subscribe`.

**`boolean observableInstance.hasEventListener( eventType:string, listener:function)`**

Only available if the target of the `observableInstance` supports `addEventListener` like a DOM Element.

Checks for existence of function with the same string representation as a listener for `eventName` on the `reactiveObject`.

Returns: The `true` or `false`.

**`boolean observableInstance.removeEventListener( eventType:string, listener:function)`**

Only available if the target of the `observableInstance` supports `removeEventListener` like a DOM Element.

Removes a listener for `eventName` with the same text representation as `listener`.

Returns: The `true` if the `listener` was found and removed, otherwise `false`.

#### ObservableEvent

**`ObservableEvent(config:object)`**

An object with the string property `type` containing an event name, e.g. `{type:"change"}`. Other properties vary based
on event type and may include:

* `target` - the reactive proxy generating the event
* `currentTarget` - the `target` or object further up the tree as a result of bubbling
* `property` - the property impacted on the `target`
* `value` - the current value of the `property`
* `oldValue` - the previous value of the `property` before the event

Typically, `ObservableEvents` are created automatically by `watchlight`, rather than by an application developer. However,
it is possible to add <a href="#custom-event-types">custom event types</a>.

Events will bubble up from an object to its containing objects. For the data below, subscribers registered on
`object` will get events for changes to `aPerson.name`.

```javascript
const object = reactive({person: {name: "joe", age: 27}}),
    aPerson = object.person;
aPerson.name = "mary";
```

The `ObservableEvent` API is very similar to the <a href="https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener" target="_tab">
browser Event API.</a> However, unlike DOM nodes, regular objects can be contained by multiple parents; hence,
bubbling can propagate more widely.

**`void observableEvent.preventDefault()`**

Prevents the event type from occurring. For example, if there is a `change` Subscription (a.k.a. listener) calling
`preventDefault` will stop the change from occurring. The event will still bubble.

**`void observableEvent.stopPropagation()`**

Stops bubbling to parent objects, but all subscribers on the current object will continue to get the event.

**`void observableEvent.stopImmediatePropagation()`**

Stops bubbling when called from a subscription, and all subsequent subscriptions will be blocked.

#### Interface ObservableEventDescriptor

**`{eventType:string, listener:function}`**

The built-in event types are described below. Also see <a href="#custom-event-types">custom event types</a>.

**&ast;**

A wild card that will match any event.

**`apply`**

Listeners on the event name `apply` are invoked when an Observable function is about to execute.

**`change`**

Listeners on the event name `change` are invoked whenever a property value is changing on an Observable.

**`defineProperty`**

Listeners on the event name `defineProperty` are invoked whenever a new property is being defined on an Observable. A new property
is assumed if the previous value of a property is `undefined`.

**`delete`**

Listeners on the event name `delete` are invoked whenever a property is deleted from an Observable.

**`fire`**

A special event supported by <a href="#inference-rules">Inference Rules</a> when their conditions are satisfied.

**`retract`**

A special event supported by Observables that have been asserted for use by <a href="#inference-rules">Inference Rules</a>.
Fires when the object is being removed from imnstances tracked by its constructor.

#### Event Listener Example

```javascript
const aPerson = reactive({name: "joe", age: 27});
aPerson.addEventListener("defineProperty", ({type, target, reactor, property, value}) => {
    console.log(type, target);
});
aPerson.addEventListener("change", ({type, target, reactor, property, value, oldValue}) => {
    console.log(type, target);
});
aPerson.addEventListener("delete",
    function myDelete({type, target, reactor, property, oldValue}) {
        console.log(type, target);
    },
    {synchronous: true});

aPerson.married = true; // invokes the defineProperty handler asynchronously using setTimeout
aPerson.age = 30; // invokes the change handler asynchronously using setTimeout with the oldValue as 27
delete aPerson.age; // invokes the delete handler synchronously with the oldValue as 30 (due to the change above)

aPerson.removeEventListener("change", ({type, target, reactor, property, value, oldValue}) => {
    console.log(type, target);
});
aPerson.removeEventListener("delete", "myDelete"); // removes the delete event listener
aPerson.removeEventListener("delete", function myDelete() {
}); // also removes the delete event listener
```

#### Custom Event Types

You can add custom event types by using `Reactor.registerEventType(eventName)`. You can then add and use event listeners
that will automatically get invoked and support the standard API when events are posted
using `reactiveObject.postMessage(eventName,options={})`.

#### Advanced Subscription Use

Subscriptions support the routing and piping of events.

The below watches for clicks on a button, ignores clicking faster than 1 every second, delays 5 seconds and
logs the click to the console.

```javascript
registerEventTypes("click");

const observableInstance = Observable(document.getElementById("mybutton"));
subscribe("click" ,observableInstance)
    .pipe([timeThrottle(1000),delay(5000)])
    .subscribe((event) => {
        console.log(event);
    });
```

The function `subscribe` knows to expect an Observable as the second argument. So, unless you need to reference
your Observable elsewhere, you can shorten the above code and the Observable
will be automatically created.

```javascript
registerEventTypes("click");

subscribe("click" ,document.getElementById("mybutton"))
    .pipe([timeThrottle(1000),delay(5000)])
    .subscribe((event) => {
        console.log(event);
    });
```

Above `pipe` is a method on Subscription returned by `subscribe`. `Watchlight` also exposes `pipe` and `route` as
top level functions. So, you can make your code even shorter.

```javascript
registerEventTypes("click");

pipe([timeThrottle(1000),delay(5000)],document.getElementById("mybutton"))
    .subscribe(click(event) => {
        console.log(event);
    });
```

And, since you are wrapping a DOM Element, you can use `addEventListener` if you prefer.

```javascript
pipe([timeThrottle(1000),delay(5000)],document.getElementById("mybutton"))
    .addEventListener("click",(event) => {
        console.log(event);
    });
```

`Watchlight` also supports `route`, which behaves the same way as most event or http routers with middleware.

```javascript
    Observable(document.getElementById("myInput"))
        .subscribe("change")
        .route(({target}) => target.value==="joe", ({target}) => ... do something)
        .route(({target}) => target.value==="mary", ({target}) => ... do something)
        .route(() => throw new TypeError(`${target.value} must be mary or joe`))
```

Routes are committed to once the first function in the route succeeds. Then the remaining functions are called until 
one returns `undefined` or calls a `preventDefault`, `stopPropagation`, or `stopImmediatePropagation` on the event it 
gets as an argument.

Under the hood, `pipe` just creates a single route and then locks the subscription so that no more routes can be added.

You will find many of the same pipeline operators as provided by RxJs, e.g.

`count`, `debounce`, `delay`, `filter`, `timeThrottle`, `map`, etc. There are also some additional operators, e.g. 
`sum`, `average`.
Since the list is long and each requires its own explanation, they are provided in a [separate file](./operators.html)
so that we can move on to inference rules.

## Inference Rules

Inference rules can match across multiple objects up and down the inheritance hierarchy. They can chain across
multiple `then` and `catch` statements similar to `Promises`. These chained statements can add new objects or change
existing objects. Rules also respond to the addition and removal of new objects in a prioritized manner. Objects can
even be automatically removed if data changes and the rules that created the objects no longer have their conditions
satisfied.

To avoid the creation of a special language or the representation of operators like "==" and ">" as strings, the
inference engine does not use the <a href="https://en.wikipedia.org/wiki/Rete_algorithm">Rete Algorithm</a> or a
derivative like most rule engines. However, it is small (4K minified/gzipped) and fast. And, this means you can use the
JavaScript debugger to step through all of your code as it is written.

`Watchlight` is currently in beta, but tests on an 8 MB Ryzen 4000 5 show that 250,000+ rule tests can be
processed per second in Firefox, Chrome, Edge and NodeJS, even when the potential rule matches exceed 1 million
combinations of objects. The number of rules that actually fire per second is entirely dependent on the nature of the
logic being modelled. If no rule conditions are satisfied, no rules will fire! Head-to-head comparisons of different
rule processing engines can only be made using the same rule and data sets.

### Anatomy of A Rule

Rules consist of:

* `condition` - A single synchronous function that accepts one object as an argument and must return `true` or `false`. 
The property names effectively represent variables in the condition. The values of the properties must be instances
created from classes defined using `class <classname> { }`. Conditions should be side effect free. Create new objects
or call non-synchronous or side effect producing functions in conditions at your own risk.
* `domain` - An object with the same properties as the argument to `condition`. The values of the properties are the
  expected classes of the values in the `condition` argument.
* `options (optional)` - Configuration data for the rule.
* `actions` - A series of chained `then` statements, the first of which gets the same argument as
  the `condition`. Subsequent `actions` get the return value of the preceding `action` as their arguments. Chaining
  stops when an `action` returns `undefined`.
* `exception handlers` - One or more `catch` statements interspersed with `actions`, although usually just the last
  statement.

```javascript
when(
    ({person1, person2}) => { // start condition
        return person1.name !== person2.name &&
            typeof (person1.age) === "number" &&
            typeof (persone2.age) === "number"
    }, // end condition
    {person1: Person, perrdon2: Person},// domain
    {priority:10} // options
    )
    .then(({person1, person2}) => { // first action
            return {person1, person2, avgAge: person1.age / person2.age}
        }
    )
    .then(({person1, person2, avgAge}) => { // chained action
        console.log(person1.name, person2.name, avgAge)
    }) 
```

### Rule Processing

Rules are processed in a cycle with a run limit that may be Infinity:

1. Match all rules to all combinations of objects in rule accessible memory, a.k.a. "working memory", by rule domain
2. Add matched rules to a rule agenda
3. Sort rule agenda by rule priority
4. For each rule on the agenda
    1. For each combination of objects
        1. remove combination from combinations
        2. Test the condition with the combination
            1. if failed, goto next rule
            2. else fire rule and process actions (add, modify, remove objects, call functions)
                1. if action adds a higher priority rule to agenda goto 3
                2. else goto next combination
    2. No more combinations goto next rule
5. No more rules
    1. if runlimit exceeded, stop
    2. else set timeout to watch for new rules added to the rule agenda

### Rule Examples

```javascript
import {when,Observable} from "./rule.js";
class Person {
    constructor({name,age}) {
        if(name==null || age==null) throw new TypeError("Person requires both name and age")
        this.name = name;
        this.age = age;
    }
}
Person = Observable(Person);

when(({object}) => true, {object: Object})
    // runs every time a new Object is added or changed
    .then(({object}) => console.log(object))
new Person({name: "joe"});
```

logs

```shell
Person {name:"joe"}
```

Note the import of `Observable` from `rule.js` rather than `watchlight.js`. This version of `Observable` has been
enhanced to support rule processing. Specifically it ensures the Observable classes keep track of all their instances
in a manner that makes rules the most efficient. It also enables the creation of pseudo-class Partial objects (see below).

```javascript
when(({person}) => person.age < 21, {person: Person})
    // runs every time a new person is added with an age < 21
    // or a person's age changes to < 21
    .then(({person}) => console.log(person, "is a minor"))
```

```javascript
Combo = Observable(Combo);
when(({person1, person2}) => {
        // creates pairs of people, automatically removes pair 
        // if a person's name changes or a person is removed
        // Combo has an equals methods on it so that it is reflexive
        return person1.name !== person2.name && not(Combo(person1, person2));
    }, // then, create pair
    ({person1, person2}) => {
        return this.justifies({person1,person2},new Combo(person1, person2))
    })
    .then((combo) => console.log("A pair:", combo))
```

Note the use of `Combo` without the word `new` in the rule test. `Combo` will test like it is an instance of Combo,
but it is not created with the Combo constructor. `Watchlight` support a concept called `Partials`, which are partially
populated instanced of classes that will not throw construction errors or trigger other rules.

### Rules API

#### any rule.catch( errorHandler:function )

`errorHandler` has the call signature `(error:Error)`.

If the error `errorHandler` returns `undefined`, the error will be swallowed.

If the `errorHandler` returns anything else, it will be used as the input argument to the next action in the chain.

If the `errorHandler` throws, the next `catch` statement will be sought.

#### boolean exists( object:Object [,test:function] )

Checks to see if an object or partial object exists. Typically, used as part of rule condition.

```javascript
let joe = reactive(new Person({name: "joe", age: 20})),
    mary = reactive(new Person({name: "mary", age: 27})),
    joe = assert(joe);
// true
joeexists = exists(joe);
// true because of joe
namedjoeexists = exists(Person({name: "joe"})); // a Partial not really a Person, will not throw error or trigger rules
// false because joe is 20 and mary is not asserted
rightageexists = exists(Person({age: 21}));
// false, because mary was not asserted to rule memory
namedmaryexists = exists(Person({name: "mary"}));
// true, because a Person that has all the same properties and values, i.e. mary, exists
deepequalexists = exists(Person({name: "mary", age: 27})); 
```

#### any rule.then(action:function)

`action` has the call signature `(data:any)`.

`data` is typically an object with multiple properties the values of which are other objects, e.g.

```javascript
{
    person:Person({name: "joe", age: 27}), 
    table: Table({number: 12, capacity: 10})
}
```

If the `action` returns `undefined`, action processing will cease.

If the `action` returns anything else, it will be used as the input argument to the next action in the chain.

Inside the `action` function you can use:

`this.justifies(justification,conclusion)` where `justification` is an object holding the facts that must remain constant
for the facts in the conclusion to remain in place. See the `examples/rules/diagnostic-confidence.js`

Returns: the return value of `action`.

#### boolean not( object:Object )

A convenience, equivalent to `!exists(object)`.

#### boolean retract( object:Object )

Stops the object from being tracked by the Observer class that created it. As a result, rules will not have access to
it and any objects created in the scope of `justifies`, where the `object` was part of a justification will be removed.

Returns: Reactive `true` if the `object` was being tracked, i.e. was not previously retracted. Otherwise, false,

<a id="when"></a>

#### Rule when(condition:function, domain:Object [,{priority:number, confidence:float])

The `condition` can be an anonymous or named function. The call signature of `condition` is `(object:Object)` where
`object` must be an Object with one or more properties. The `condition` MUST return `true` or `false` indicating if the
members of the `object` satisfy the rule conditions.

The `domain` MUST be an Object with the same properties as the `object` argument to `condition`. The values of the
properties MUST be classes or constructors.

`confidence` sets a confidence on a rule or Observable data. This is available to the `this.justifies` function and also
via `this.withConfidence` in the `then` statements of a rule.
a `confidence` = minimum confidence of data used to fire the rule * confidence of the rule. You can run the
example <a href="./examples/rules/diagnostic-confidence.html" target="_tab">diagnostic confidence</a> or view its
<a href="./examples/rules/diagnostic-confidence.js" target="_tab">source</a>.

Returns: Reactive `Proxy` for `condition`, i.e. a `Rule`.

### Instance Bound Rules

Reactive objects can have instance bound rules associated with them in addition to <a href="#event-handlers">event
handlers<a>
and <a href="#observers">observers</a>. Unlike event handlers and observers, these rules get added to the rule
processing agenda.

There are two options for binding. The first is to provide a rule that applies only to the object it is bound to:

```javascript
const joe = assert(new Person({name: "joe", age: 27}));
joe.when((joe) => joe.age > 27)
    .then((joe) => console.log("joe too old", joe.age));
```

Note the lack of domain and the un-parametrized object as an argument.

If Joe's age changes before the rule has an opportunity to fire (perhaps due to a higher priority rule), then the
console message will not be written.

The second option is to allow comparing with other objects:

```javascript
const joe = assert(new Person({name: "joe", age: 27}));
// This rule will match Joe with all possible partners.
joe.when(({bound, partner}) => {
    return partner.name !== bound.name
}, {partner: Person})
    .then(({bound, partner}) => {
        console.log("joe partner", partner)
    });
```

Note the domain and the parameterized object as an argument.

The property `bound` MUST be present in the condition argument. And, MUST NOT be present in the `domain`.

### Rule Example Files

<a href="./examples/rules/fibonacci.html" target=_tab>Fibonacci sequence generation</a>: <a href="./examples/rules/fibonacci.js" target=_tab>source</a>.

<a href="./examples/rules/pairs.html" target=_tab>Pair matching beyond the examples in this document.</a>: <a href="./examples/rules/pairs.js" target=_tab>source</a>.

## Spreadsheet

Spreadsheet like functionality is provided through a separately loaded module `./sheet.js`. The functionality is
headless and depends on object access paths for its notation. It is also n-dimensional and sparse. Formulas can be set
at any level in a sheet's data hierarchy and any legal property names can be used for navigation through the hierarchy.
Any type of data can be stored in cells. There is no support for selecting, cutting, pasting, etc.; although, these
could be provided by a wrapper.

### Dimension and Cell

`Dimension` is a psuedo-class, i.e. you can't use `instanceof` to check if something is a `Dimension`. Any time an
undefined property or sub-property is accessed on a `Sheet` a `Dimension` is created. If a `Dimension` is directly
assigned a value or a function, it is converted into an instance of the psuedo-class `Cell`. `Cells`
only exist at leaf nodes of `Dimensions`. Existing `Dimensions` can be overridden and converted into a `Cell`
by direct assignment of a value or function.

Cells in a `Sheet` with functions assigned, provide a method `withFormat` that can take either a string or a function as
an argument. If a string, then it should be an un-interpolated string template literal that accesses
`this.valueOf()`. If a function, it will get the cell as its `this` value, so it can call `this.valueOf()`. It should
return a string.

The code below can be <a href="./examples/sheets/basic.html" target=_tab>run</a>
or <a href="./examples/sheets/basic.js">viewed</a>
in the <a href="./examples/index.htm" target=_tab>examples</a> directory.

```javascript
import {Sheet} from "../sheet.js";

const sheet = Sheet();
sheet.A[0]; // no assignment is made, so sheet.A[0] will automatically be a Dimension when accessed
sheet.A[1] = 1; // sheet.A[1] is a Cell. Dimensions and Cells are created automatically
sheet.A[2] = 1;
sheet.A[3] = () => A[1] + A[2]; // Note, there is no need to include sheet; watchlight manages the resolution
sheet.A[3].withFormat("$${this.valueOf().toFixed(2)}");
sheet.A[4] = 1;
sheet.B[1] = () => sum(values(A, 2, 3));
sheet.B[2] = () => sum(A);
console.log(sheet.B[1].valueOf()); // logs 3
console.log(sheet.B[2].valueOf()); // logs 5
console.log(sheet.A[3].valueOf()); // logs 2
console.log(sheet.A[3].format()); // logs $2.00
sheet.A[2] = 2;
console.log(sheet.A[3].valueOf()); // logs 3

sheet[1][2][1] = () => {
    return A[3] + 1
}; // completely different dimension approach
console.log(sheet[1][2][1].valueOf()); // logs 4
sheet.A[2] = 4;
setTimeout(() => { // let recalculation settle out
    console.log(sheet.A[3].valueOf()); // logs 5
    console.log(sheet.A[3].format()); // logs $5.00
    console.log(sheet[1][2][1].valueOf()); // logs 6
    console.log(sheet.B[1].valueOf()); // logs 9
})
```

`Sheet` functions behave like their similarly named counterparts in MS Excel and Google Sheet.

Most functions will automatically convert cell references to iterables when necessary.

Some functions require a cell or a value for an argument and not a `Dimension`. If you call a function that can't take
a `Dimension` with a `Dimension`, you will get an error similar to this:

```shell
TypeError: isnumber(A.5) 'A.5' is a Dimension not a value or Cell
```

### Self Referencing Formulas

Directly circular formulas are automatically avoided by excluding the cell in which the formula is defined from the
range it may reference, e.g.

```javascript
const sheet = Sheet();
sheet.tab1.A[1] = 1;
sheet.tab1.A[2] = 2;
sheet.tab1.A[3] = 3;
sheet.tab1.A[4] = () => sum([tab1.A]); // 5
 ```

### Paths

The path to a `Dimension` or `Cell` is available as a property:

```javascript
const sheet = Sheet();
console.log(sheet.tab1.A[1].path); // logs "tab1.A.1"
```

### Logical and Info Functions

#### number count(values:Array<any>|Dimension,{start:number|string,end:number|string})

#### number counta(values:Array<any>|Dimension,{start:number|string,end:number|string})

#### any iff(test:truthy, value1:any, value2:any)

#### boolean isdimension(value:any)

#### boolean isblank(value:any)

#### boolean isboolean(value:any)

#### boolean isempty(value:any)

#### boolean islogical(value:any)

#### boolean isnumber(value:any)

#### boolean isobject(value:any)

#### boolean isstring(value:any)

#### boolean isundefined(value:any)

#### number len(value:any)

Throws `TypeError` if `value` does not have a `length` or `size` property or function.

### Math Functions

#### number average(values:array|Dimension,{start:number|string,end:number|string})

#### number exp(value:number,power:number)

#### number log10(value:number)

#### number max(values:Array<number>|Dimension,{start:number|string,end:number|string})

#### number median(numbers:Array<number>)

#### number min(values:Array<number>|Dimension,{start:number|string,end:number|string})

#### number product(values:Array<number>|Dimension,{start:number|string,end:number|string})

#### number stdev(values:Array<number>|Dimension,{start:number|string,end:number|string})

#### number sum(values:Array<number>|Dimension,{start:number|string,end:number|string})

#### number variance(values:Array<number>|Dimension,{start:number|string,end:number|string})

#### number zscores(values:Array<number>|Dimension,{start:number|string,end:number|string})

Returns Array.

### Trigonometry Functions

#### number acos(value:number)

#### number acosh(value:number)

#### number asin(value:number)

#### number asinh(value:number)

#### number atan(value:number)

#### number atan2(value:number)

#### number cos(value:number)

#### number cosh(value:number)

#### number pi()

#### number rand()

#### number sin(value:number)

#### number tan(value:number)

#### number tanh(value:number)

### Coercion Functions

#### number int(value:string|number)

#### number float(value:string|number)

#### string lower(value:string)

#### Array<number> numbers(source:Array<any>|Dimension, start:number|string, end:number|string)

`source` can be an Array or a `Sheet` dimension. If `end` is less that `start` the return value is reversed.

Returns an array of all numbers from the object based on the keys between and including `start` and `end`.

#### Array<numbers> numbersa(values:Array<number>|Dimension, {start:number|string, end:number|string})

`source` can be an Array or a `Sheet` dimension. If `end` is less that `start` the return value is reversed.

Returns an array of all values coercible into numbers from the object based on the keys between and including
`start` and `end`. Strings are parsed as floats and booleans are converted to 1s and 0s.

#### string upper(value:string)

#### number value(data:any)

#### Array<any> values(values:Array<any>|Dimension, {start:number|string, end:number|string})

`source` can be an Array or a `Sheet` dimension. If `end` is less that `start` the return value is reversed.

Returns an array of values from the object based on the keys between and including `start` and `end`.

## License

`Watchlight` is dual licensed:

AGPLv3

or

A custom commercial license. Contact syblackwell@anywhichway.com.

## Change History

Reverse Chronological Order

2022-04-25 v1.1.2b Optimized `subscribe`, made more conformant with `RxJs`. Deleted kitchensink example since
there are now many more structured examples and it was out of date with API. Many `RxJs` operators added and unit tested,
but yet to be documents. This release has seen some performance degradation in rules. Should be able to optimize back in.

2022-04-20 v1.1.1b Modified naming to be more consistent with `RxJs`. Added a range of `RxJs` operators. Corrected
issue where `bubbles` and `defaultPrevented` were ignored on events.
Split rule functionality into a separate file. Deprecated `whilst` for simpler `justifies` approach. Optimized rule 
processing with some light-weight indexing to support faster `retract` and `not`. Eliminated `assert`, creating an 
`Obervable` object automatically invokes the rules it may match. Eliminated `withOptions` on rules to simplify API.
Modified `Sheet` so that closures can ultimately be supported. This required changing the way default tabs can be established for
cell formula references. Added many functions for use in formulas.

2022-04-03 v1.0.17b Updated license token to more standard form.

2022-04-03 v1.0.16b Added automation of existing tests to package.json.

2022-03-27 v1.0.15b Modified event bubbling to be consistent with browser approach. `preventDefault()` will no longer
stop bubbling. Use `stopPropagation()` or `stopImmediatePropagation()` to stop bubbling.

2022-03-27 v1.0.14b Fixed issue with `ReactorEvent` properties not being enumerable, which prevent spread and assign
copying.

2022-03-27 v1.0.13b Support for custom event types added.

2022-03-26 v1.0.12b More rule examples. Added foundation for confidence based, a.k.a. "fuzzy", reasoning.
Modified `result` portions of `whilst` for more flexible results return. Adjusted TOC layout and scrolling.

2022-03-25 v1.0.11b Documentation content updates.

2022-03-25 v1.0.10b Documentation content updates. Improved swipe behavior of TOC.

2022-03-25 v1.0.9b Documentation content updates. Renamed main entry point to `watchlight.js`. More unit tests and event
bubbling work. Fixed issue with observers not stopping when requested.

2022-03-25 v1.0.8b Documentation layout. Added event bubbling. Renamed `event` property in `ReactorEvent` to `type`.

2022-03-24 v1.0.7b Documentation layout. More unit tests. Fixed issues with checking presence of and removing event
handlers.

2022-03-24 v1.0.6b Documentation TOC tray added.

2022-03-23 v1.0.5b Documentation style updates.

2022-03-23 v1.0.4b More unit tests. Documentation content and style updates.

2022-03-23 v1.0.3b Unit tests, fixed bug in proxy property lookup that was creating extra reactive sub-objects when
value was false. Minor rule performance improvement. Added `observer.withOptions`.

2022-03-22 v1.0.2b Documentation updates.

2022-03-22 v1.0.1b Documentation updates, added Partial and Sheet

2022-03-20 v0.0.7b Documentation updates, observer examples, renaming of some internals

2022-03-19 v0.0.6b Documentation updates, examples added, enhanced whilst with `onassert`

2022-03-19 v0.0.5b Documentation updates, enhanced instance bound rules

2022-03-19 v0.0.4b Documentation updates, performance improvements

2022-03-18 v0.0.3b Documentation updates

2022-03-18 v0.0.2b Documentation updates

2022-03-18 v0.0.1b Initial public release
</div>


