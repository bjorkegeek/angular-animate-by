"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@angular/core");
/**
 * The `AnimateBy` directive allows for custom enter and leave animations with
 * proper lifecycle management (unlike with angular's built-in animation subsystem).
 *
 * AnimateBy is implemented as a structural directive and because Angular does
 * not allow pluggable microsyntax you need to put the directive in an
 * ng-template tag. It works kind of like an ngIf/ngFor hybrid.
 *
 * The directive is given an input object which represents what will be animated.
 * If the input object is ```undefined```, nothing is rendered.
 * If the object (identity) changes, the current instance will be animated out
 * and a new instance will be created for the new object.  This means that
 * just like with ngFor, an arbitrary number of instances may coexist.
 * [Inside *ngFor](https://angular.io/guide/structural-directives#inside-ngfor)
 * is suggested reading.
 *
 * By adding the attribute "let-myObject" a template input variable named
 * "myObject" will be created referring to the object that is held by the
 * currently rendered instance.
 *
 * animateBy provides the following exported values:
 *
 *  * `existence` A floating value between 0 and 1 specifying to what extent
 *    the current instance is on screen. This will move from 0 to 1 during
 *    entering and from 1 to 0 during leaving
 *  * `state` The state of the current instance, may be `'entering'`,
 *    `'leaving'` or `'here'`.
 *
 * A separate attribute "animateByOptions" may be specified which must be an
 * object of type `AnimateByOptions`.
 *
 * Example:
 * ```html
 * <ng-template [animateBy]="theNumber"
 *              [animateByOptions]="{timings: {enter: 500, leave: 300}}"
 *              let-myNumber
 *              let-v="existence"
 *              let-myState="state">
 *   <div *ngIf="myState === 'entering'" [ngStyle]="{position: 'absolute', height: '1em', width: (1-v)*100 + 'px', 'background-color':'white'}"></div>
 *   <div [ngStyle]="{height: (myState === 'entering'?1:v)+'em', overflow: 'hidden'}">I'm number {{ myNumber }}</div>
 * </ng-template>
 * ```
 * As theNumber changes, the existing number will be animated out and the new
 * one will be animated in.
 */
let AnimateByDirective = class AnimateByDirective {
    constructor(templateRef, cd, viewContainer, elRef) {
        this.templateRef = templateRef;
        this.cd = cd;
        this.viewContainer = viewContainer;
        this.elRef = elRef;
        this.animateByOptions = {
            timings: defaultAnimateByTimings()
        };
        this.stack = new Array();
        this.inited = false;
    }
    ngOnInit() {
        if (this.timings && core_1.isDevMode() && console && console.warn) {
            console.warn("'timings' attribute no longer supported by animate-by directive.\n" +
                "Please use the animateByOptions attribute.");
        }
        this.inited = true;
        if (this.elRef.nativeElement && this.elRef.nativeElement.ownerDocument) {
            let doc = this.elRef.nativeElement.ownerDocument;
            this.window = doc.parentWindow || doc.defaultView;
        }
    }
    ngOnDestroy() {
        if (this.animId) {
            this.window.cancelAnimationFrame(this.animId);
        }
    }
    set animateBy(v) {
        let co = this.current ? this.current.context.$implicit : undefined;
        if (co !== v) {
            if (this.current) {
                this.removeCurrent();
            }
            if (v !== undefined) {
                this.newCurrent(v);
            }
        }
    }
    newCurrent(v) {
        let instant = !this.window || !this.inited;
        let context = new AnimateByContext(v, instant ? 'here' : 'entering', this.animateByOptions.timings || defaultAnimateByTimings());
        let view = this.viewContainer.createEmbeddedView(this.templateRef, context);
        this.current = { context, view };
        this.stack.push(this.current);
        if (!instant) {
            this.scheduleAnimationFrame();
        }
    }
    removeCurrent() {
        if (this.window) {
            if (this.current.context.state === 'here') {
                this.current.context.state = 'leaving';
                this.scheduleAnimationFrame();
            }
            else if (this.animateByOptions.symmetric &&
                this.current.context.state == 'entering') {
                this.current.context.state = 'reverse';
                this.scheduleAnimationFrame();
            }
        }
        else {
            this.removeStackEntry(this.current);
        }
        this.current = undefined;
    }
    scheduleAnimationFrame() {
        if (this.animId === undefined && this.window) {
            this.animId = this.window.requestAnimationFrame((clock) => this.doAnimationFrame(clock));
        }
    }
    doAnimationFrame(clock) {
        let scheduleAnother = false;
        this.animId = undefined;
        let toRemove = new Array();
        for (let stackEntry of this.stack) {
            let context = stackEntry.context;
            if (context.state !== 'here' && context.startTime === undefined) {
                context.startTime = clock;
            }
            if (context.state === 'reverse') {
                reverseAnimation(context, clock);
            }
            let localClock = clock - context.startTime;
            if (context.state === 'entering') {
                context.existence = Math.min(1, localClock / context.timings.enter);
                if (context.existence >= 1) {
                    if (stackEntry === this.current) {
                        context.state = 'here';
                    }
                    else {
                        context.state = 'leaving';
                        scheduleAnother = true;
                    }
                    context.startTime = undefined;
                }
                else {
                    scheduleAnother = true;
                }
            }
            else if (context.state === 'leaving') {
                context.existence = 1 - Math.min(1, localClock / context.timings.leave);
                if (context.existence <= 0) {
                    toRemove.push(stackEntry);
                }
                else {
                    scheduleAnother = true;
                }
            }
        }
        for (let stackEntry of toRemove) {
            this.removeStackEntry(stackEntry);
        }
        this.cd.markForCheck();
        if (scheduleAnother) {
            this.scheduleAnimationFrame();
        }
    }
    removeStackEntry(stackEntry) {
        let index = this.stack.indexOf(stackEntry);
        this.viewContainer.remove(index);
        this.stack.splice(index, 1);
    }
};
__decorate([
    core_1.Input()
], AnimateByDirective.prototype, "timings", void 0);
__decorate([
    core_1.Input()
], AnimateByDirective.prototype, "animateByOptions", void 0);
__decorate([
    core_1.Input()
], AnimateByDirective.prototype, "animateBy", null);
AnimateByDirective = __decorate([
    core_1.Directive({ selector: '[animateBy]' })
], AnimateByDirective);
exports.AnimateByDirective = AnimateByDirective;
var theDefaultAnimateByTimings = { enter: 1000, leave: 1000 };
function defaultAnimateByTimings() {
    return theDefaultAnimateByTimings;
}
function reverseAnimation(context, clock) {
    context.startTime = clock - context.timings.leave * (1 - context.existence);
    context.state = 'leaving';
}
class AnimateByContext {
    constructor($implicit, state, timings) {
        this.$implicit = $implicit;
        this.state = state;
        this.timings = Object.assign({}, timings);
        this.existence = (state === 'here') ? 1 : 0;
    }
}
//# sourceMappingURL=animate-by.directive.js.map