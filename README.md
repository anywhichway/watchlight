# watchlight v1.0.1b (BETA)

A light weight (11K minified, 4K gzipped), comprehensive, reactive framework for business logic.

`Watchlight` is un-opinionated and provides a range of approaches to support reactive programming beyond the DOM and
user interface.

* <a href="#event-listeners">Event listeners</a> on any reactive object via `addEventListener`.
* <a href="#observers">Observers</a> via functions wrapping reactive objects, e.g. `observer(() => console.log(myObject.name))` 
will log the `name` every time it changes.
* <a href="#inference-rules">Inference rules</a> similar to  <a href="https://www.drools.org/">Drools</a> or 
<a href="https://www.npmjs.com/package/rools">Rools</a> and modeled after the `Promise` paradigm.
* And, no reactive library would be complete without a spreadsheet like <a href="#sheet">Sheet</a>.

The `Sheet` is provided as a separate file and is not included in the 4K size stated above.

`Watchlight` does not use any intermediate languages or transpilation; hence, you can debug all of your code as written 
using a standard JavaScript debugger.

## Installation

`Watchlight` is provided as a JavaScript module. It can be loaded directly in a modern browser or used directly in 
<a href="https://nodejs.dev/">NodeJS</a>.

```shell
npm install watchlight
```

Transpiling and minifying is left to the developer using the library.

## Example Use

There are examples in the <a href="./examples">examples</a> directory and sub-directories. Most examples can be run by 
both loading an HTML file and running the command `node examplefilename.js`. The HTML files just load the same JavaScript 
files that are fed to NodeJS on the command line.

## Reactive Objects and Constructors

Reactive objects can have <a href="#event-listeners">event listeners</a> attached, be the subject of 
<a href="#observers">observers</a>, and be referenced by <a href="#inference-rules">inference rules</a>.

When the properties of reactive objects contain sub-objects their values are also returned as reactive objects.

If a class constructor is made reactive, it will return a reactive instance when it is called to create a new 
instance. Reactive class constructors do not need to be called with `new`.

```javascript
class Person {
    constructor({name,age}) {
        this.name = name;
        this.age = age;
    }
}
Person = reactive(Person);
const joe = Person({name:"joe",age:27}); // joe is a reactive object
```

### Reactive Object API

#### Proxy reactive(target:object|function)

Returns: A reactive proxy for the objector function.

## Event Listeners

Reactive objects created using `reactive(target)` can dispatch event listeners. 

Event listeners are added via `addEventListener`. They can be revoked via `removeEventListener`. Listeners are indexed
internally based on their name; hence, adding a new named function with the same name as an existing one will
overwrite the existing one. Anonymous functions are indexed by their text representation; hence, if you plan to
overwrite them, you should not use functions that contain closure values and count on the functions being preserved as
different event handlers.

The dispatch is done via `setTimeout` to avoid blocking on high volume changes. An optional configuration can be 
provided to cause synchronous dispatch (see <a href="#event-listener-example">example</a> below).

### Event Listener API

#### ReactorEvent(config:object)

An object with the string property `event` containing an event name, e.g. `{event:"change"}`. Other properties vary 
based on event type and may include:

* `target` - target of the reactive proxy generating the event
* `proxy` - the reactive proxy generating the event
* `property` - the property impacted on the `target`
* `value` - the current value of the `property`
* `oldValue` - the previous value of the `property` before the event

Typically, created automatically by `watchlight`, rather than by an application developer.

#### Proxy reactiveObject.addEventListener(eventName:string,listener:function)

Adds a `function` as an event listener on the `eventName`. The listener will receive a `ReactorEvent` when the
`eventName` occurs on the `reactiveObject`, i.e. the listener has the signature `({event,....rest})`.

Returns: The `reactiveObject`.

#### boolean reactiveObject.hasEventListener(eventName:string,listener:function|string)

Checks for existence of function of the same name or in the case of anonymous functions same string representation as a 
listener for `eventName` on the `reactiveObject`.

Returns: The `true` or `false`.

#### Proxy reactiveObject.removeEventListener(eventName:string,listener:function|string)

Removes a listener for `eventName` with the same name or that is the function on the `reactiveObject`.

Returns: The `reactiveObject`.

### Supported Event Names

Some of the events below are only supported by <a href="#inference-rules">Inference Rules</a>.

#### fire

A special event supported by <a href="#inference-rules">Inference Rules</a> when their conditions are satisfied.

#### defineProperty

Listeners on the event name `defineProperty` are invoked whenever a new property is defined on an object. A new property 
is assumed if the previous value of a property is `undefined`.

#### change

Listeners on the event name `change` are invoked whenever a property value is changed on an object.

#### delete

Listeners on the event name `delete` are invoked whenever a property is deleted from an object.

#### retract

A special event supported by objects that have been asserted for use by <a href="#inference-rules">Inference Rules</a>.
Fires when the object is removed from working memory.

### Event Listener Example

```javascript
const aPerson = reactive({name:"joe",age:27});
aPerson.addEventListener("defineProperty",({event,target,reactor,property,value}) => {  console.log(event,target);   });
aPerson.addEventListener("change",({event,target,reactor,property,value,oldValue}) => {  console.log(event,target); });
aPerson.addEventListener("delete",
        function myDelete({event,target,reactor,property,oldValue}) { console.log(event,target);  },
        {synchronous:true});

aPerson.married = true; // invokes the defineProperty handler asynchronously using setTimeout
aPerson.age = 30; // invokes the change handler asynchronously using setTimeout with the oldValue as 27
delete aPerson.age; // invokes the delete handler synchronously with the oldValue as 30 (due to the change above)

aPerson.removeEventListener("change",({event,target,reactor,property,value,oldValue}) => { console.log(event,target); });
aPerson.removeEventListener("delete","myDelete"); // removes the delete event listener
aPerson.removeEventListener("delete",function myDelete() {}); // also removes the delete event listener
```

## Observers

Observers are functions that get invoked automatically every time the properties on the reactive objects they reference 
change in value. They are more powerful that event handlers because they can operate across multiple objects.

Observers are the cornerstone of the `watchlight` <a href="#sheet">spreadsheet</a> functionality.

### Example

```javascript
const user = reactive({name:"mary"});
const hello = observer(() => {
   console.log("Hello",user.name);
})
user.name = "joe";
```

writes

```shell
Hello mary
Hello joe
```

Nested property access automatically creates child reactors, changes to which will invoke the observer so long as the
changes are made via navigation through the parent reactor.

```javascript
const user = reactive({name:"mary",contactInfo:{phone:"555-555-5555"}});
observer(() => {
   console.log(JSON.stringify(user)); // recursively accesses every property
})
user.contactInfo.phone = "999-999-9999";
```

```shell
{"name":"mary","contactInfo":{"phone":"555-555-5555"}}
{"name":"mary","contactInfo":{"phone":"999-999-9999"}}
```

### Observer API

#### any observer(aFunction:function[,thisArg:object,...args:any])

Creates an observer from `aFunction` you provide. The observer will be called any time the properties on the 
objects it references change in value. You can also call the observer directly like it was the original function.

Observers are indexed internally by name. Creating an observer from a new function with the same name as a previous
observer will overwrite the old observer. Anonymous functions are not.

You can pass a default `thisArg` and `...args` when creating an observer.

Synchronously invoked sub-functions will cause reactive dependencies for the containing observer. Use `unobserve` to
avoid dependencies.

Asynchronously invoked sub-functions, e.g. those inside `setTimeout` or a `Promise` will not cause reactive dependencies.

Returns: The value returned by the function you provide.

```javascript
import {reactive,observer} from "../../index.js";

const user = reactive({name:"mary"});
const hello = observer(() => {
   console.log("Hello",user.name);
})

const world = reactive({});
observer(function(message) {
   this.user = user.name
   console.log(message,user.name);
},world,"Welcome to the world")
observer(() => {
   if(world.user) console.log(`${world.user} owns the world.`)
})

user.name = "joe";

hello();
```

will print

```shell
Hello mary
Welcome to the world mary
mary owns the world.
Hello joe
joe owns the world.
Welcome to the world joe
Hello joe
```

#### any unobserve(aFunction:function)

You can nest `unobserve` inside an observer if you do not want changes to a particular object or property to cause
invocation of the observer.

Functions wrapped in `unobserve` are transient and will get the `this` context of the enclosing observer so long as
you define them using `=>`.

Returns: The value returned by the function you provide.

`unobserve` is useful when you need to use arrays but do not want index modification or access to cause an observer
to be re-invoked or when you want to use JSON.stringify.

```javascript
import {reactive,observer,unobserve} from "../../index.js";

const tasks = reactive([
    {name:"task1",duration:2000},
    {name:"task2",duration:3000},
    {name:"task3",duration:1000}, 
    {name:"task4",duration:2000}]);

const doTasks = observer(() => {
    const task = tasks.currentTask = unobserve(() => tasks.shift());
    if (task) {
        // complete the task in the defined duration
        setTimeout(() => task.complete = true, task.duration);
        tasks.currentTask = task;
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
setTimeout(() => tasks.push(reactive({name:"task5",duration:2000})),10000);
```

## Inference Rules

Inference rules can match across multiple objects up and down the inheritance hierarchy. They can chain across 
multiple `then` and `catch` statements similar to `Promises`. These chained statements can add new objects or change 
existing objects. Rules also respond to the addition and removal of new objects in a prioritized manner. Objects 
can even be automatically removed if data changes and the rules that created the objects no longer have their conditions 
satisfied.

To avoid the creation of a special language or the representation of operators like "==" and ">" as strings, the
inference engine does not use the <a href="https://en.wikipedia.org/wiki/Rete_algorithm">Rete Algorithm</a> or a 
derivative like most rule engines. However, it is small (4K minified/gzipped) and fast. And, this means you can
use the JavaScript debugger to step through all of your code as it is written.

Watchlight is currently in beta, but tests on an 8 MB Ryzen 4000 5 show that 120,000 to 160,000+ rule tests can be processed 
per second in Firefox, Chrome, Edge and NodeJS, even when the potential rule matches exceed 1 million combinations
of objects. The number of rules that actually fire per second is entirely dependent on the nature of the logic being
modelled. If no rule conditions are satisfied, no rules will fire! Head-to-head comparisons of different rule
processing engines can only be made using the same rule and data sets.

### Anatomy of A Rule

Rules consist of:

* `condition` - A single function that accepts one object as an argument and must return `true` or `false`.
* `logically dependent data (optional)` - only present for <a href="#whilst">`whilst`</a> not <a href="#when">`when`</a> 
rules.
* `domain` - An object with the same properties as the argument to `condition`. The values of the properties are
the expected classes of the values in the `condition` argument.
* `options (optional)` - An optional chained call providing configuration data for the rule.
* `actions` - A series of chained `then` statements, the first of which usually gets the same argument as the `condition`.
Subsequent `actions` get the return value of the preceding `action` as their arguments. Chaining stops when an `action`
returns `undefined`.
* `exception handlers` - One or more `catch` statements interspersed with `actions`, although usually just the last
statement.

```javascript
when(
    ({person1,person2}) => { // start condition
        return person1.name !== person2.name &&
            typeof (person1.age) === "number" &&
            typeof (persone2.age) === "number"
    }, // end condition
    {person1:Person,perrdon2:Person} // domain
).withOptions({priority:10}) // options
    .then(({person1,person2}) => { return {person1,person2,avgAge:person1.age / person2.age} }) // first action
    .then(({person1,person2,avgAge}) => console.log(person1.name,person2.name,avgAge)) // chained action
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
   
### Examples

```javascript
when(({object}) => true,{object:Object}) 
    // runs every time a new Object is added or changed
    .then(({object}) => console.log(object))
assert(new Person({name:"joe"}));
assert({count:1});
```
prints 

```shell
Person {name:"joe"}
{count: 1}
```

```javascript
when(({person}) => person.age<21,{person:Person}) 
    // runs every time a new person is added with an age < 21 or a person's age changes to < 21
    .then(({person}) => console.log(person,"is a minor"))
```

```javascript
 whilst(function match({person1,person2}) {
     // creates pairs of people, automatically removes pair if a person's name changes or a person is removed
     // Combo has an equals methods on it so that it is reflexive
     return person1.name!==person2.name && not(Combo(person1,person2));
},({person1,person2}) => Combo(person1,person2), {person1:Person,person2:Person})
    .then((combo) => console.log("A pair:",combo)) // NOTE: then gets the newly created object as its argument
```

### Inference Rules API

#### Object Partial(constructor:function,data:object)

Sometimes it is useful to match a partial object against working memory. The class constructors you use
may have required arguments that prevent this. `Partial` addresses this problem. If you pass the class or a
traditional JavaScript constructor and an object containing data to use for initialization, `Partial` will return
an object that seems to be an `instanceof` the constructor.

```javascript
class Desk {
    constructor(location) {
        if(location===undefined) throw new TypeError("'location' is required for Desk");
        this.location = location;
    }
    assign(person) {
        this.assigned = person;
    }
}
when(({person}) => not(Partial(Desk,{assigned:person})),{person:Person})
        .then(({person}) => console.log(person,"is not assigned a desk"));
```

#### Proxy assert(data:object)

Adds data to the working memory used by rules. Automatically turns `object` into a reactive object, if it was not already.

Returns: Reactive proxy for the object asserted.

```javascript
const joe = assert(new Person({name:"joe",age:27}));
```

#### any rule.catch(errorHandler:function)

`errorHandler` has the call signature `(error:Error)`.

If the error `errorHandler` returns `undefined`, the error will be swallowed.

If the `errorHandler` returns anything else, it will be used as the input argument to the next action in the chain.

If the `errorHandler` throws, the next `catch` statement will be sought.

#### boolean exists(object:Object [,test:function])

Checks to see if an object or partial object exists. Typically, used as part of rule condition.

```javascript
let joe = reactive(new Person({name:"joe",age:20})),
    mary = reactive(new Person({name:"mary",age:27})),
    joe = assert(joe);
joeexists = exists(joe); // true
namedjoeexists = exists(new Person({name:"joe"})); // true because of joe
rightageexists = exists(new Person({age:21})); // false because joe is 20 and mary is not asserted
namedmaryexists = exists(new Person({name:"mary"})); // false, because mary was noit asserted to rule memory
```

#### any rule.then(action:function,{conditions})

`action` has the call signature `(data:any)`.

`data` is typically an object with multiple properties the values of which are other objects, e.g. 
`{person:Person({name:"joe",age:27}),table:Table({number:12,capacity:10})`.

If the `action` returns `undefined`, action processing will cease.

If the `action` returns anything else, it will be used as the input argument to the next action in the chain.

`conditions` is a `Map` subclass with reactive objects accessed by the `rule` as keys and an object with properties and
values at the time of `rule` firing as the entries. Currently, its sole use is for input to `reactiveObject.withConditions`.

Returns: `any` implementation defined.

#### boolean not(object:Object)

A convenience, equivalent to `!exists(object)`.

#### Proxy retract(object:Object)

Removes data from the working memory used by rules.

Returns: Reactive `Proxy` for the data if it was in working memory, otherwise `undefined`.

```javascript
let joe = reactive(new Person({name:"joe",age:27})),
    mary = reactive(new Person({name:"mary",age:27})),
joe = assert(joe);
joe = retract(joe); // joe is still defined
mary = retract(mary) // mary is now undefined because she did not exist in rule memory
```

<a id="when"></a>
#### Proxy when(condition:function,domain:Object)

The `condition` can be an anonymous or named function. The call signature of `condition` is `(object:Object)` where 
`object` must be an Object with one or more properties. The `condition` MUST return `true` or `false` indicating if 
the members of the `object` satisfy the rule conditions.

The `domain` MUST be an Object with the same properties as the `object` argument to `condition`. The values of
the properties MUST be classes or constructors.

Returns: Reactive `Proxy` for `condition`.

<a id="whilst"></a>
#### Proxy whilst(condition:function,conclusion:function,domain:object,options:Object)

Rules created with `whilst` have a conclusion that is logically dependent on the continued truth of the `condition`.

The constraints on `condition` and `domain` are the same as those for `when`. The additional `conclusion` argument in 
the second position is a function with a call signature that matches that of `condition`. The `conclusion` MUST
return an object or array of objects of any class. The array returned MUST be a direct Array, not a subclassed Array, i.e.
its property `constructor`===`Array`. This object or objects are made reactive and asserted to rule memory. They are 
then used as the input argument to the first `action`, i.e. `then` statement.

If you need to get hold of the reactive assertion(s), add a `onassert` to the rule `options`.

Returns: Reactive `Proxy` for `condition`.

```javascript
whilst(
    function match({person1,person2}) { 
        return person1.name!==person2.name && not(Combo(person1,person2)); // condition
    },
    ({person1,person2}) => Combo(person1,person2), // conclusion
    {person1:Person,person2:Person}, // domain
    {onassert:({event,proxy,target}) => console.log("asserted",proxy)})
    .then((combo) => combo.addEventListener("retract",() => console.log("retracted",combo))) // watch for retraction
    .then((combo) => console.log("A pair!",combo))
```

Note: In the `onassert` handler, if the object created in the `conclusion` is from a reactive constructor, both the 
`proxy` and the `target` will be a `Proxy`. Otherwise, `target` will be a plain JavaScript instance that is the target 
of the `proxy`.

The `retract` handler will fire if either person in the `Combo` is deleted or has a name change.

#### reactiveObject.withConditions(conditions:Map)

A `whilst` rule automatically manages logical dependency of data. However, there may be times when you want to
manage the dependency directly. The `withConditions` function can support you in this.

The `this` context of `then` is the data which causes a rule to fire. The match rule above could be written as:

```javascript
whilst(
    function match({person1,person2}) { 
        return person1.name!==person2.name && not(Combo(person1,person2)); // condition
    },
    {person1:Person,person2:Person}) // domain
    .then(function({person1,person2},{conditions}) {
        const combo = assert(Combo(person1,person2)).withConditions(conditions);
        console.log("asserted",combo);
    })
    .then((combo) => combo.addEventListener("retract",() => console.log("retracted",combo))) // watch for retraction
    .then((combo) => console.log("A pair!",combo))
```

Returns: `reactiveObject`

#### rule.withOptions({priority:number})

Sets a priority on a rule. If multiple rules are matched at the same time, the highest priority rules fire first. The
actions of these rules may result in lower priority rules no longer firing.

Returns `rule`.

### Instance Bound Rules

Reactive objects can have instance bound rules associated with then in addition to <a href="#event-handlers">event handlers<a>
and <a href="#observers">observers</a>. Unlike event handlers and observers, these rules get added to the rule processing agenda. 

There are two options for binding. The first is to provide a rule that applies only to the object it is bound to:

```javascript
const joe = assert(new Person({name:"joe",age:27}));
joe.when((joe) => joe.age>27)
    .then((joe) => console.log("joe too old",joe.age));
```

Note the lack of domain and the un-parametrized object as an argument.

If Joe's age changes before the rule has an opportunity to fire (perhaps due to a higher priority rule), then the console
message will not be written.

The second option is to allow comparing with other objects:

```javascript
joe.when(function({bound,partner}) {
    return partner.name!==bound.name
},{partner:Person})
    .then(({bound,partner}) => console.log("joe partner",partner));
```

Note the domain and the parameterized object as an argument.

The property `bound` MUST be present in the condition argument. And, MUST NOT be present in the `domain`.

This rule will match Joe with all possible partners.

### Inference Rules Examples

<a href="./examples/rules/fibonacci.html">Fibonacci sequence generation</a>.

<a href="./examples/rules/pairs.html">Pair matching beyond the examples in this document.</a>.

## Sheet

Spreadsheet like functionality is provided through a separately loaded module `./sheet.js`. The functionality is
headless and depends on object access paths for its notation. It is also n-dimensional and sparse. Formulas can be set at
any level in a sheet's data hierarchy and any legal property names can be used for navigation through the
hierarchy. Any type of data can be stored in cells. There is no support for selecting, cutting, pasting, etc.; although, 
these could be provided by a wrapper.

The code below can be <a href="./examples/sheets/basic.html">run</a> or <a href="./examples/sheets/basic.js">viewed</a>
in the <a href="./examples">examples></a> directory.

```javascript
import {Sheet} from "../Sheet.js";

const sheet = Sheet();
sheet.A[1] = 1; // dimensions and cells are created automatically
sheet.A[2] = 1;
sheet.A[3] = () => A[1] + A[2]; // Note, there is no need to include sheet; watchlight manages the resolution
sheet.A[3].withFormat("$${this.valueOf().toFixed(2)}");
sheet.A[4] = 1;
sheet.B[1] = () => sum(values(A,2,3));
sheet.B[2] = () => sum(A);
console.log(sheet.B[1].valueOf()); // logs 3
console.log(sheet.B[2].valueOf()); // logs 5
console.log(sheet.A[3].valueOf()); // logs 2
console.log(sheet.A[3].format()); // logs $2.00
sheet.A[2] = 2;
console.log(sheet.A[3].valueOf()); // logs 3

sheet[1][2][1] =  () => {
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

Cells in a `Sheet` have a function `withFormat` that can take either a string or a function as an argument. If a string,
then it should be an un-interpolated string template literal that access `this.valueOf()`. If a function, it will
get the cell as its `this` value, so it can call `this.valueOf()`. It should return a string.

During this early release, there are only basic functions on a `Sheet`, you may need to add more as a first argument:

```javascript
const sheet = Sheet({
    reverse(value) {
        if(value) {
            if(typeof(value.reverse)==="function") return value.reverse();
            if(typeof(value)==="string") return value.split().reverse().join();
        }
    }
})
```

Sheet functions behave like their similarly named functions in MS Excel and Google Sheet.

Most functions will automatically convert cell references to iterables that are spread into arguments when necessary.

### Logical and Info Sheet Functions

#### iff(test, value1, value2) 
#### isboolean(value)
#### isboolean(value) 
#### isundefined(value) 
#### islogical(value) 
#### isnumber(value) 
#### isobject(value) 
#### isstring(value) 
#### len(value)

### Math Sheet Functions

#### average(...numbers)

#### count(...numbers)

#### countblank(...any)

### exp(number,power)

### log10(number)

### max(...numbers|strings)

### median(...numbers)

### min(...numbers|strings)

#### product(....numbers)

#### stdev(...numbers)

#### sum(....numbers)

#### variance(...numbers)

#### zscores(...numbers)

Returns Array.

### Trigonometry Sheet Functions

#### acos(number)
#### acosh(number) 
#### asin(number)
#### asinh(number)
#### atan(number) 
#### atan2(number) 
#### cos(number) 
#### cosh(number) 
#### pi() 
#### rand() 
#### sin(number)
#### tan(number) 
#### tanh(number) 

### Coercion Sheet Functions

#### int(value:string|number)

#### float(value:string|number)

#### lower(string) 

#### numbers(source:object,start:number|string,end:number|string)

`source` can be an Array or a `Sheet` dimension. If `end` is less that `start` the return value is reversed.

Returns an array of all numbers from the object based on the keys between and including `start` and `end`.

#### numbersa(source:object,start:number|string,end:number|string)

`source` can be an Array or a `Sheet` dimension. If `end` is less that `start` the return value is reversed.

Returns an array of all values coercible into numbers from the object based on the keys between and including 
`start` and `end`. Strings are parsed as floats and booleans are converted to 1s and 0s.

#### upper(string)

#### value(data:any)

#### values(source:object,start:number|string,end:number|string)

`source` can be an Array or a `Sheet` dimension. If `end` is less that `start` the return value is reversed.

Returns an array of values from the object based on the keys between and including `start` and `end`.

## Other Examples

Look at the <a href="./examples/kitchensink.html">kitchen sink</a>.

## License

`Watchlight` is dual licensed:

AGPL-3.0-or-later

or

A custom commercial license. Contact syblackwell@anywhichway.com.

## Change History (Reverse Chronological Order)

2022-03-22 v1.0.1b Documentation updates, added Partial and Sheet

2022-03-20 v0.0.7b Documentation updates, observer examples, renaming of some internals

2022-03-19 v0.0.6b Documentation updates, examples added, enhanced whilst with `onassert`

2022-03-19 v0.0.5b Documentation updates, enhanced instance bound rules

2022-03-19 v0.0.4b Documentation updates, performance improvements

2022-03-18 v0.0.3b Documentation updates

2022-03-18 v0.0.2b Documentation updates

2022-03-18 v0.0.1b Initial public release