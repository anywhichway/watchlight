<div style="position:fixed;min-width:100%;opacity:1;background:white;margin-bottom:0px;height:1.5em">
<a href="https://watchlight.dev">watchlight.dev</a> v1.0.17 beta</div>
<div id="TOC" style="position:fixed;top:2em;max-height:97%;height:97%;opacity:1;background:white">
   <div id="header" style="font-weight:bold;margin-top:0px">
     &nbsp;<span id="toggle-button" style="display:none;float:right;font-weight:bold;margin-top:0px">&lt;&lt;</span>
   </div>
   <div class="toc" style="border:1px solid grey;margin-right:5px;border-radius:5px;overflow-x:hidden;overflow-y:auto;background:whitesmoke">
   </div>
</div>
<div id="content" style="float:right;padding-top:0px;max-height:100vh;overflow:auto;opacity:1">

## Watchlight Subscription Operators

Watchlight provides a subset of the operators provided by RxJs. It also provides some additional operators.

The [RxJS documentation](https://creativecommons.org/licenses/by/4.0/) is under a [Creative Commons v4 License](https://creativecommons.org/licenses/by/4.0/) like this documentation; hence, we have partitioned our operator
documentation in a manner similar to RxJS and re-used descriptions and examples.

Pipeable Operators are the kind that can be piped to Observables using the syntax observableInstance.pipe(operator()). These include, filter(...), and mergeMap(...). When called, they do not change the existing Observable instance. Instead, they return a new Observable, whose subscription logic is based on the first Observable.

A Pipeable Operator is a function that takes an Observable as its input and returns another Observable. It is a pure operation: the previous Observable stays unmodified.

A Pipeable Operator is essentially a pure function which takes one Observable as input and generates another Observable as output. Subscribing to the output Observable will also subscribe to the input Observable.

Creation Operators are the other kind of operator, which can be called as standalone functions to create a new Observable. For example: of(1, 2, 3) creates an observable that will emit 1, 2, and 3, one right after another. Creation operators will be discussed in more detail in a later section.

For example, the operator called map is analogous to the Array method of the same name. Just as [1, 2, 3].map(x => x * x) will yield [1, 4, 9], the Observable created like this:

```javascript
import { of } from 'watchlight';
import { map } from 'watchlight/operators';

of(1, 2, 3)
  .pipe(map((x) => x * x))
  .subscribe((v) => console.log(`value: ${v}`));
```

will log

```shell
1
4
9
```

Another useful operator is first:

```javascript
import { of } from 'watchlight.js';
import { first } from 'watchlight/operators';

of(1, 2, 3)
  .pipe(first())
  .subscribe((v) => console.log(`value: ${v}`));
```

logs

```shell
1
```

Note that map logically must be constructed on the fly, since it must be given the mapping function to. By contrast, first could be a constant, but is nonetheless constructed on the fly. As a general practice, all operators are constructed, whether they need arguments or not.

### Creation Operators

`**from**`

`**merge**`

`**range**`

`**pipe**`

`**route**`

`**split**`

`**subscribe**`




### Pipeable Operators


### Transformation Operators

**`map`**

**`scan`**

### Utility Operators

**`delay`**

### Filtering Operators

**`debounceTime`**

**`filter`**

**`skipUntil`**

**`skipUntilTime`**

**`skipWhile`**

**`takeFinal`**

**`takeUntil`**

**`takeUntilTime`**

**`takeWhile`**

**`timeThrottle`**

### Mathematical and Aggregate Operators

**`count`**

**`max`**

**`min`**

**`reduce`**

**`sum`**

</div>