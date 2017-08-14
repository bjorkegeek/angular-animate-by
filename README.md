The `AnimateBy` directive allows for custom enter and leave animations with proper lifecycle management (unlike with angular's built-in animation subsystem).

AnimateBy is implemented as a structural directive and because Angular does not allow pluggable microsyntax you need to put the directive in an ng-template tag. It works kind of like an ngIf/ngFor hybrid.

The directive is given an input object which represents what will be animated. If the input object is ```undefined```, nothing is rendered. If the object (identity) changes, the current instance will be animated out and a new instance will be created for the new object.  This means that just like with ngFor, an arbitrary number of instances may coexist. [Inside *ngFor](https://angular.io/guide/structural-directives#inside-ngfor) is suggested reading.

By adding the attribute "let-myObject" a template input variable named "myObject" will be created referring to the object that is held by the currently rendered instance.

animateBy provides the following exported values:

 * `existence` A floating value between 0 and 1 specifying to what extent the current instance is on screen. This will move from 0 to 1 during entering and from 1 to 0 during leaving
 * `state` The state of the current instance, may be `'entering'`, `'leaving'` or `'here'`.

A separate attribute "animateByOptions" may be specified which must be an object of type `AnimateByOptions`.

Example:
```html
<ng-template [animateBy]="theNumber"
             [animateByOptions]="{timings: {enter: 500, leave: 300}}"
             let-myNumber
             let-v="existence"
             let-myState="state">
  <div *ngIf="myState === 'entering'" [ngStyle]="{position: 'absolute', height: '1em', width: (1-v)*100 + 'px', 'background-color':'white'}"></div>
  <div [ngStyle]="{height: (myState === 'entering'?1:v)+'em', overflow: 'hidden'}">I'm number {{ myNumber }}</div>
</ng-template>
```
As theNumber changes, the existing number will be animated out and the new one will be animated in.

## AnimateByOptions
### `symmetric`
Controls behavior when an object is removed before the entry animation is complete. If `symmetric` is set to false (or is not defined), the _enter_ animation will be run to completion, after which a complete _leave_ animation will be run. If `symmetric` is set to true, the _enter_ animation is halted and replaced by a _leave_ animation at the same value of _existence_.
### `timings`
An AnimateByTimings object

## AnimateByTimings
### `enter`
Duration in milliseconds of _enter_ animation
### `leave`
Duration in milliseconds of _leave_ animation
