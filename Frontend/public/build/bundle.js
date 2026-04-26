
(function(l, r) { if (!l || l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (self.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(self.document);
var app = (function () {
    'use strict';

    function noop() { }
    const identity = x => x;
    function assign(tar, src) {
        // @ts-ignore
        for (const k in src)
            tar[k] = src[k];
        return tar;
    }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    let src_url_equal_anchor;
    function src_url_equal(element_src, url) {
        if (!src_url_equal_anchor) {
            src_url_equal_anchor = document.createElement('a');
        }
        src_url_equal_anchor.href = url;
        return element_src === src_url_equal_anchor.href;
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }
    function validate_store(store, name) {
        if (store != null && typeof store.subscribe !== 'function') {
            throw new Error(`'${name}' is not a store with a 'subscribe' method`);
        }
    }
    function subscribe(store, ...callbacks) {
        if (store == null) {
            return noop;
        }
        const unsub = store.subscribe(...callbacks);
        return unsub.unsubscribe ? () => unsub.unsubscribe() : unsub;
    }
    function component_subscribe(component, store, callback) {
        component.$$.on_destroy.push(subscribe(store, callback));
    }
    function split_css_unit(value) {
        const split = typeof value === 'string' && value.match(/^\s*(-?[\d.]+)([^\s]*)\s*$/);
        return split ? [parseFloat(split[1]), split[2] || 'px'] : [value, 'px'];
    }

    const is_client = typeof window !== 'undefined';
    let now = is_client
        ? () => window.performance.now()
        : () => Date.now();
    let raf = is_client ? cb => requestAnimationFrame(cb) : noop;

    const tasks = new Set();
    function run_tasks(now) {
        tasks.forEach(task => {
            if (!task.c(now)) {
                tasks.delete(task);
                task.f();
            }
        });
        if (tasks.size !== 0)
            raf(run_tasks);
    }
    /**
     * Creates a new task that runs on each raf frame
     * until it returns a falsy value or is aborted
     */
    function loop(callback) {
        let task;
        if (tasks.size === 0)
            raf(run_tasks);
        return {
            promise: new Promise(fulfill => {
                tasks.add(task = { c: callback, f: fulfill });
            }),
            abort() {
                tasks.delete(task);
            }
        };
    }

    const globals = (typeof window !== 'undefined'
        ? window
        : typeof globalThis !== 'undefined'
            ? globalThis
            : global);
    function append(target, node) {
        target.appendChild(node);
    }
    function get_root_for_style(node) {
        if (!node)
            return document;
        const root = node.getRootNode ? node.getRootNode() : node.ownerDocument;
        if (root && root.host) {
            return root;
        }
        return node.ownerDocument;
    }
    function append_empty_stylesheet(node) {
        const style_element = element('style');
        append_stylesheet(get_root_for_style(node), style_element);
        return style_element.sheet;
    }
    function append_stylesheet(node, style) {
        append(node.head || node, style);
        return style.sheet;
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        if (node.parentNode) {
            node.parentNode.removeChild(node);
        }
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function svg_element(name) {
        return document.createElementNS('http://www.w3.org/2000/svg', name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function empty() {
        return text('');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function prevent_default(fn) {
        return function (event) {
            event.preventDefault();
            // @ts-ignore
            return fn.call(this, event);
        };
    }
    function stop_propagation(fn) {
        return function (event) {
            event.stopPropagation();
            // @ts-ignore
            return fn.call(this, event);
        };
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_input_value(input, value) {
        input.value = value == null ? '' : value;
    }
    function set_style(node, key, value, important) {
        if (value == null) {
            node.style.removeProperty(key);
        }
        else {
            node.style.setProperty(key, value, important ? 'important' : '');
        }
    }
    function select_option(select, value, mounting) {
        for (let i = 0; i < select.options.length; i += 1) {
            const option = select.options[i];
            if (option.__value === value) {
                option.selected = true;
                return;
            }
        }
        if (!mounting || value !== undefined) {
            select.selectedIndex = -1; // no option should be selected
        }
    }
    function select_value(select) {
        const selected_option = select.querySelector(':checked');
        return selected_option && selected_option.__value;
    }
    function toggle_class(element, name, toggle) {
        element.classList[toggle ? 'add' : 'remove'](name);
    }
    function custom_event(type, detail, { bubbles = false, cancelable = false } = {}) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, bubbles, cancelable, detail);
        return e;
    }

    // we need to store the information for multiple documents because a Svelte application could also contain iframes
    // https://github.com/sveltejs/svelte/issues/3624
    const managed_styles = new Map();
    let active = 0;
    // https://github.com/darkskyapp/string-hash/blob/master/index.js
    function hash(str) {
        let hash = 5381;
        let i = str.length;
        while (i--)
            hash = ((hash << 5) - hash) ^ str.charCodeAt(i);
        return hash >>> 0;
    }
    function create_style_information(doc, node) {
        const info = { stylesheet: append_empty_stylesheet(node), rules: {} };
        managed_styles.set(doc, info);
        return info;
    }
    function create_rule(node, a, b, duration, delay, ease, fn, uid = 0) {
        const step = 16.666 / duration;
        let keyframes = '{\n';
        for (let p = 0; p <= 1; p += step) {
            const t = a + (b - a) * ease(p);
            keyframes += p * 100 + `%{${fn(t, 1 - t)}}\n`;
        }
        const rule = keyframes + `100% {${fn(b, 1 - b)}}\n}`;
        const name = `__svelte_${hash(rule)}_${uid}`;
        const doc = get_root_for_style(node);
        const { stylesheet, rules } = managed_styles.get(doc) || create_style_information(doc, node);
        if (!rules[name]) {
            rules[name] = true;
            stylesheet.insertRule(`@keyframes ${name} ${rule}`, stylesheet.cssRules.length);
        }
        const animation = node.style.animation || '';
        node.style.animation = `${animation ? `${animation}, ` : ''}${name} ${duration}ms linear ${delay}ms 1 both`;
        active += 1;
        return name;
    }
    function delete_rule(node, name) {
        const previous = (node.style.animation || '').split(', ');
        const next = previous.filter(name
            ? anim => anim.indexOf(name) < 0 // remove specific animation
            : anim => anim.indexOf('__svelte') === -1 // remove all Svelte animations
        );
        const deleted = previous.length - next.length;
        if (deleted) {
            node.style.animation = next.join(', ');
            active -= deleted;
            if (!active)
                clear_rules();
        }
    }
    function clear_rules() {
        raf(() => {
            if (active)
                return;
            managed_styles.forEach(info => {
                const { ownerNode } = info.stylesheet;
                // there is no ownerNode if it runs on jsdom.
                if (ownerNode)
                    detach(ownerNode);
            });
            managed_styles.clear();
        });
    }

    function create_animation(node, from, fn, params) {
        if (!from)
            return noop;
        const to = node.getBoundingClientRect();
        if (from.left === to.left && from.right === to.right && from.top === to.top && from.bottom === to.bottom)
            return noop;
        const { delay = 0, duration = 300, easing = identity, 
        // @ts-ignore todo: should this be separated from destructuring? Or start/end added to public api and documentation?
        start: start_time = now() + delay, 
        // @ts-ignore todo:
        end = start_time + duration, tick = noop, css } = fn(node, { from, to }, params);
        let running = true;
        let started = false;
        let name;
        function start() {
            if (css) {
                name = create_rule(node, 0, 1, duration, delay, easing, css);
            }
            if (!delay) {
                started = true;
            }
        }
        function stop() {
            if (css)
                delete_rule(node, name);
            running = false;
        }
        loop(now => {
            if (!started && now >= start_time) {
                started = true;
            }
            if (started && now >= end) {
                tick(1, 0);
                stop();
            }
            if (!running) {
                return false;
            }
            if (started) {
                const p = now - start_time;
                const t = 0 + 1 * easing(p / duration);
                tick(t, 1 - t);
            }
            return true;
        });
        start();
        tick(0, 1);
        return stop;
    }
    function fix_position(node) {
        const style = getComputedStyle(node);
        if (style.position !== 'absolute' && style.position !== 'fixed') {
            const { width, height } = style;
            const a = node.getBoundingClientRect();
            node.style.position = 'absolute';
            node.style.width = width;
            node.style.height = height;
            add_transform(node, a);
        }
    }
    function add_transform(node, a) {
        const b = node.getBoundingClientRect();
        if (a.left !== b.left || a.top !== b.top) {
            const style = getComputedStyle(node);
            const transform = style.transform === 'none' ? '' : style.transform;
            node.style.transform = `${transform} translate(${a.left - b.left}px, ${a.top - b.top}px)`;
        }
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error('Function called outside component initialization');
        return current_component;
    }
    /**
     * The `onMount` function schedules a callback to run as soon as the component has been mounted to the DOM.
     * It must be called during the component's initialisation (but doesn't need to live *inside* the component;
     * it can be called from an external module).
     *
     * `onMount` does not run inside a [server-side component](/docs#run-time-server-side-component-api).
     *
     * https://svelte.dev/docs#run-time-svelte-onmount
     */
    function onMount(fn) {
        get_current_component().$$.on_mount.push(fn);
    }
    /**
     * Schedules a callback to run immediately after the component has been updated.
     *
     * The first time the callback runs will be after the initial `onMount`
     */
    function afterUpdate(fn) {
        get_current_component().$$.after_update.push(fn);
    }
    /**
     * Schedules a callback to run immediately before the component is unmounted.
     *
     * Out of `onMount`, `beforeUpdate`, `afterUpdate` and `onDestroy`, this is the
     * only one that runs inside a server-side component.
     *
     * https://svelte.dev/docs#run-time-svelte-ondestroy
     */
    function onDestroy(fn) {
        get_current_component().$$.on_destroy.push(fn);
    }
    /**
     * Creates an event dispatcher that can be used to dispatch [component events](/docs#template-syntax-component-directives-on-eventname).
     * Event dispatchers are functions that can take two arguments: `name` and `detail`.
     *
     * Component events created with `createEventDispatcher` create a
     * [CustomEvent](https://developer.mozilla.org/en-US/docs/Web/API/CustomEvent).
     * These events do not [bubble](https://developer.mozilla.org/en-US/docs/Learn/JavaScript/Building_blocks/Events#Event_bubbling_and_capture).
     * The `detail` argument corresponds to the [CustomEvent.detail](https://developer.mozilla.org/en-US/docs/Web/API/CustomEvent/detail)
     * property and can contain any type of data.
     *
     * https://svelte.dev/docs#run-time-svelte-createeventdispatcher
     */
    function createEventDispatcher() {
        const component = get_current_component();
        return (type, detail, { cancelable = false } = {}) => {
            const callbacks = component.$$.callbacks[type];
            if (callbacks) {
                // TODO are there situations where events could be dispatched
                // in a server (non-DOM) environment?
                const event = custom_event(type, detail, { cancelable });
                callbacks.slice().forEach(fn => {
                    fn.call(component, event);
                });
                return !event.defaultPrevented;
            }
            return true;
        };
    }
    // TODO figure out if we still want to support
    // shorthand events, or if we want to implement
    // a real bubbling mechanism
    function bubble(component, event) {
        const callbacks = component.$$.callbacks[event.type];
        if (callbacks) {
            // @ts-ignore
            callbacks.slice().forEach(fn => fn.call(this, event));
        }
    }

    const dirty_components = [];
    const binding_callbacks = [];
    let render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = /* @__PURE__ */ Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function tick() {
        schedule_update();
        return resolved_promise;
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    // flush() calls callbacks in this order:
    // 1. All beforeUpdate callbacks, in order: parents before children
    // 2. All bind:this callbacks, in reverse order: children before parents.
    // 3. All afterUpdate callbacks, in order: parents before children. EXCEPT
    //    for afterUpdates called during the initial onMount, which are called in
    //    reverse order: children before parents.
    // Since callbacks might update component values, which could trigger another
    // call to flush(), the following steps guard against this:
    // 1. During beforeUpdate, any updated components will be added to the
    //    dirty_components array and will cause a reentrant call to flush(). Because
    //    the flush index is kept outside the function, the reentrant call will pick
    //    up where the earlier call left off and go through all dirty components. The
    //    current_component value is saved and restored so that the reentrant call will
    //    not interfere with the "parent" flush() call.
    // 2. bind:this callbacks cannot trigger new flush() calls.
    // 3. During afterUpdate, any updated components will NOT have their afterUpdate
    //    callback called a second time; the seen_callbacks set, outside the flush()
    //    function, guarantees this behavior.
    const seen_callbacks = new Set();
    let flushidx = 0; // Do *not* move this inside the flush() function
    function flush() {
        // Do not reenter flush while dirty components are updated, as this can
        // result in an infinite loop. Instead, let the inner flush handle it.
        // Reentrancy is ok afterwards for bindings etc.
        if (flushidx !== 0) {
            return;
        }
        const saved_component = current_component;
        do {
            // first, call beforeUpdate functions
            // and update components
            try {
                while (flushidx < dirty_components.length) {
                    const component = dirty_components[flushidx];
                    flushidx++;
                    set_current_component(component);
                    update(component.$$);
                }
            }
            catch (e) {
                // reset dirty state to not end up in a deadlocked state and then rethrow
                dirty_components.length = 0;
                flushidx = 0;
                throw e;
            }
            set_current_component(null);
            dirty_components.length = 0;
            flushidx = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        seen_callbacks.clear();
        set_current_component(saved_component);
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    /**
     * Useful for example to execute remaining `afterUpdate` callbacks before executing `destroy`.
     */
    function flush_render_callbacks(fns) {
        const filtered = [];
        const targets = [];
        render_callbacks.forEach((c) => fns.indexOf(c) === -1 ? filtered.push(c) : targets.push(c));
        targets.forEach((c) => c());
        render_callbacks = filtered;
    }

    let promise;
    function wait() {
        if (!promise) {
            promise = Promise.resolve();
            promise.then(() => {
                promise = null;
            });
        }
        return promise;
    }
    function dispatch(node, direction, kind) {
        node.dispatchEvent(custom_event(`${direction ? 'intro' : 'outro'}${kind}`));
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
        else if (callback) {
            callback();
        }
    }
    const null_transition = { duration: 0 };
    function create_in_transition(node, fn, params) {
        const options = { direction: 'in' };
        let config = fn(node, params, options);
        let running = false;
        let animation_name;
        let task;
        let uid = 0;
        function cleanup() {
            if (animation_name)
                delete_rule(node, animation_name);
        }
        function go() {
            const { delay = 0, duration = 300, easing = identity, tick = noop, css } = config || null_transition;
            if (css)
                animation_name = create_rule(node, 0, 1, duration, delay, easing, css, uid++);
            tick(0, 1);
            const start_time = now() + delay;
            const end_time = start_time + duration;
            if (task)
                task.abort();
            running = true;
            add_render_callback(() => dispatch(node, true, 'start'));
            task = loop(now => {
                if (running) {
                    if (now >= end_time) {
                        tick(1, 0);
                        dispatch(node, true, 'end');
                        cleanup();
                        return running = false;
                    }
                    if (now >= start_time) {
                        const t = easing((now - start_time) / duration);
                        tick(t, 1 - t);
                    }
                }
                return running;
            });
        }
        let started = false;
        return {
            start() {
                if (started)
                    return;
                started = true;
                delete_rule(node);
                if (is_function(config)) {
                    config = config(options);
                    wait().then(go);
                }
                else {
                    go();
                }
            },
            invalidate() {
                started = false;
            },
            end() {
                if (running) {
                    cleanup();
                    running = false;
                }
            }
        };
    }
    function create_out_transition(node, fn, params) {
        const options = { direction: 'out' };
        let config = fn(node, params, options);
        let running = true;
        let animation_name;
        const group = outros;
        group.r += 1;
        function go() {
            const { delay = 0, duration = 300, easing = identity, tick = noop, css } = config || null_transition;
            if (css)
                animation_name = create_rule(node, 1, 0, duration, delay, easing, css);
            const start_time = now() + delay;
            const end_time = start_time + duration;
            add_render_callback(() => dispatch(node, false, 'start'));
            loop(now => {
                if (running) {
                    if (now >= end_time) {
                        tick(0, 1);
                        dispatch(node, false, 'end');
                        if (!--group.r) {
                            // this will result in `end()` being called,
                            // so we don't need to clean up here
                            run_all(group.c);
                        }
                        return false;
                    }
                    if (now >= start_time) {
                        const t = easing((now - start_time) / duration);
                        tick(1 - t, t);
                    }
                }
                return running;
            });
        }
        if (is_function(config)) {
            wait().then(() => {
                // @ts-ignore
                config = config(options);
                go();
            });
        }
        else {
            go();
        }
        return {
            end(reset) {
                if (reset && config.tick) {
                    config.tick(1, 0);
                }
                if (running) {
                    if (animation_name)
                        delete_rule(node, animation_name);
                    running = false;
                }
            }
        };
    }
    function create_bidirectional_transition(node, fn, params, intro) {
        const options = { direction: 'both' };
        let config = fn(node, params, options);
        let t = intro ? 0 : 1;
        let running_program = null;
        let pending_program = null;
        let animation_name = null;
        function clear_animation() {
            if (animation_name)
                delete_rule(node, animation_name);
        }
        function init(program, duration) {
            const d = (program.b - t);
            duration *= Math.abs(d);
            return {
                a: t,
                b: program.b,
                d,
                duration,
                start: program.start,
                end: program.start + duration,
                group: program.group
            };
        }
        function go(b) {
            const { delay = 0, duration = 300, easing = identity, tick = noop, css } = config || null_transition;
            const program = {
                start: now() + delay,
                b
            };
            if (!b) {
                // @ts-ignore todo: improve typings
                program.group = outros;
                outros.r += 1;
            }
            if (running_program || pending_program) {
                pending_program = program;
            }
            else {
                // if this is an intro, and there's a delay, we need to do
                // an initial tick and/or apply CSS animation immediately
                if (css) {
                    clear_animation();
                    animation_name = create_rule(node, t, b, duration, delay, easing, css);
                }
                if (b)
                    tick(0, 1);
                running_program = init(program, duration);
                add_render_callback(() => dispatch(node, b, 'start'));
                loop(now => {
                    if (pending_program && now > pending_program.start) {
                        running_program = init(pending_program, duration);
                        pending_program = null;
                        dispatch(node, running_program.b, 'start');
                        if (css) {
                            clear_animation();
                            animation_name = create_rule(node, t, running_program.b, running_program.duration, 0, easing, config.css);
                        }
                    }
                    if (running_program) {
                        if (now >= running_program.end) {
                            tick(t = running_program.b, 1 - t);
                            dispatch(node, running_program.b, 'end');
                            if (!pending_program) {
                                // we're done
                                if (running_program.b) {
                                    // intro — we can tidy up immediately
                                    clear_animation();
                                }
                                else {
                                    // outro — needs to be coordinated
                                    if (!--running_program.group.r)
                                        run_all(running_program.group.c);
                                }
                            }
                            running_program = null;
                        }
                        else if (now >= running_program.start) {
                            const p = now - running_program.start;
                            t = running_program.a + running_program.d * easing(p / running_program.duration);
                            tick(t, 1 - t);
                        }
                    }
                    return !!(running_program || pending_program);
                });
            }
        }
        return {
            run(b) {
                if (is_function(config)) {
                    wait().then(() => {
                        // @ts-ignore
                        config = config(options);
                        go(b);
                    });
                }
                else {
                    go(b);
                }
            },
            end() {
                clear_animation();
                running_program = pending_program = null;
            }
        };
    }
    function outro_and_destroy_block(block, lookup) {
        transition_out(block, 1, 1, () => {
            lookup.delete(block.key);
        });
    }
    function fix_and_outro_and_destroy_block(block, lookup) {
        block.f();
        outro_and_destroy_block(block, lookup);
    }
    function update_keyed_each(old_blocks, dirty, get_key, dynamic, ctx, list, lookup, node, destroy, create_each_block, next, get_context) {
        let o = old_blocks.length;
        let n = list.length;
        let i = o;
        const old_indexes = {};
        while (i--)
            old_indexes[old_blocks[i].key] = i;
        const new_blocks = [];
        const new_lookup = new Map();
        const deltas = new Map();
        const updates = [];
        i = n;
        while (i--) {
            const child_ctx = get_context(ctx, list, i);
            const key = get_key(child_ctx);
            let block = lookup.get(key);
            if (!block) {
                block = create_each_block(key, child_ctx);
                block.c();
            }
            else if (dynamic) {
                // defer updates until all the DOM shuffling is done
                updates.push(() => block.p(child_ctx, dirty));
            }
            new_lookup.set(key, new_blocks[i] = block);
            if (key in old_indexes)
                deltas.set(key, Math.abs(i - old_indexes[key]));
        }
        const will_move = new Set();
        const did_move = new Set();
        function insert(block) {
            transition_in(block, 1);
            block.m(node, next);
            lookup.set(block.key, block);
            next = block.first;
            n--;
        }
        while (o && n) {
            const new_block = new_blocks[n - 1];
            const old_block = old_blocks[o - 1];
            const new_key = new_block.key;
            const old_key = old_block.key;
            if (new_block === old_block) {
                // do nothing
                next = new_block.first;
                o--;
                n--;
            }
            else if (!new_lookup.has(old_key)) {
                // remove old block
                destroy(old_block, lookup);
                o--;
            }
            else if (!lookup.has(new_key) || will_move.has(new_key)) {
                insert(new_block);
            }
            else if (did_move.has(old_key)) {
                o--;
            }
            else if (deltas.get(new_key) > deltas.get(old_key)) {
                did_move.add(new_key);
                insert(new_block);
            }
            else {
                will_move.add(old_key);
                o--;
            }
        }
        while (o--) {
            const old_block = old_blocks[o];
            if (!new_lookup.has(old_block.key))
                destroy(old_block, lookup);
        }
        while (n)
            insert(new_blocks[n - 1]);
        run_all(updates);
        return new_blocks;
    }
    function validate_each_keys(ctx, list, get_context, get_key) {
        const keys = new Set();
        for (let i = 0; i < list.length; i++) {
            const key = get_key(get_context(ctx, list, i));
            if (keys.has(key)) {
                throw new Error('Cannot have duplicate keys in a keyed each');
            }
            keys.add(key);
        }
    }

    function get_spread_update(levels, updates) {
        const update = {};
        const to_null_out = {};
        const accounted_for = { $$scope: 1 };
        let i = levels.length;
        while (i--) {
            const o = levels[i];
            const n = updates[i];
            if (n) {
                for (const key in o) {
                    if (!(key in n))
                        to_null_out[key] = 1;
                }
                for (const key in n) {
                    if (!accounted_for[key]) {
                        update[key] = n[key];
                        accounted_for[key] = 1;
                    }
                }
                levels[i] = n;
            }
            else {
                for (const key in o) {
                    accounted_for[key] = 1;
                }
            }
        }
        for (const key in to_null_out) {
            if (!(key in update))
                update[key] = undefined;
        }
        return update;
    }
    function get_spread_object(spread_props) {
        return typeof spread_props === 'object' && spread_props !== null ? spread_props : {};
    }
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor, customElement) {
        const { fragment, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = component.$$.on_mount.map(run).filter(is_function);
                // if the component was destroyed immediately
                // it will update the `$$.on_destroy` reference to `null`.
                // the destructured on_destroy may still reference to the old array
                if (component.$$.on_destroy) {
                    component.$$.on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            flush_render_callbacks($$.after_update);
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, append_styles, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: [],
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(options.context || (parent_component ? parent_component.$$.context : [])),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false,
            root: options.target || parent_component.$$.root
        };
        append_styles && append_styles($$.root);
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            if (!is_function(callback)) {
                return noop;
            }
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.59.2' }, detail), { bubbles: true }));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation, has_stop_immediate_propagation) {
        const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        if (has_stop_immediate_propagation)
            modifiers.push('stopImmediatePropagation');
        dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function prop_dev(node, property, value) {
        node[property] = value;
        dispatch_dev('SvelteDOMSetProperty', { node, property, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.data === data)
            return;
        dispatch_dev('SvelteDOMSetData', { node: text, data });
        text.data = data;
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    function construct_svelte_component_dev(component, props) {
        const error_message = 'this={...} of <svelte:component> should specify a Svelte component.';
        try {
            const instance = new component(props);
            if (!instance.$$ || !instance.$set || !instance.$on || !instance.$destroy) {
                throw new Error(error_message);
            }
            return instance;
        }
        catch (err) {
            const { message } = err;
            if (typeof message === 'string' && message.indexOf('is not a constructor') !== -1) {
                throw new Error(error_message);
            }
            else {
                throw err;
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    const subscriber_queue = [];
    /**
     * Creates a `Readable` store that allows reading by subscription.
     * @param value initial value
     * @param {StartStopNotifier} [start]
     */
    function readable(value, start) {
        return {
            subscribe: writable(value, start).subscribe
        };
    }
    /**
     * Create a `Writable` store that allows both updating and reading by subscription.
     * @param {*=}value initial value
     * @param {StartStopNotifier=} start
     */
    function writable(value, start = noop) {
        let stop;
        const subscribers = new Set();
        function set(new_value) {
            if (safe_not_equal(value, new_value)) {
                value = new_value;
                if (stop) { // store is ready
                    const run_queue = !subscriber_queue.length;
                    for (const subscriber of subscribers) {
                        subscriber[1]();
                        subscriber_queue.push(subscriber, value);
                    }
                    if (run_queue) {
                        for (let i = 0; i < subscriber_queue.length; i += 2) {
                            subscriber_queue[i][0](subscriber_queue[i + 1]);
                        }
                        subscriber_queue.length = 0;
                    }
                }
            }
        }
        function update(fn) {
            set(fn(value));
        }
        function subscribe(run, invalidate = noop) {
            const subscriber = [run, invalidate];
            subscribers.add(subscriber);
            if (subscribers.size === 1) {
                stop = start(set) || noop;
            }
            run(value);
            return () => {
                subscribers.delete(subscriber);
                if (subscribers.size === 0 && stop) {
                    stop();
                    stop = null;
                }
            };
        }
        return { set, update, subscribe };
    }
    function derived(stores, fn, initial_value) {
        const single = !Array.isArray(stores);
        const stores_array = single
            ? [stores]
            : stores;
        const auto = fn.length < 2;
        return readable(initial_value, (set) => {
            let started = false;
            const values = [];
            let pending = 0;
            let cleanup = noop;
            const sync = () => {
                if (pending) {
                    return;
                }
                cleanup();
                const result = fn(single ? values[0] : values, set);
                if (auto) {
                    set(result);
                }
                else {
                    cleanup = is_function(result) ? result : noop;
                }
            };
            const unsubscribers = stores_array.map((store, i) => subscribe(store, (value) => {
                values[i] = value;
                pending &= ~(1 << i);
                if (started) {
                    sync();
                }
            }, () => {
                pending |= (1 << i);
            }));
            started = true;
            sync();
            return function stop() {
                run_all(unsubscribers);
                cleanup();
                // We need to set this to false because callbacks can still happen despite having unsubscribed:
                // Callbacks might already be placed in the queue which doesn't know it should no longer
                // invoke this derived store.
                started = false;
            };
        });
    }

    function parse(str, loose) {
    	if (str instanceof RegExp) return { keys:false, pattern:str };
    	var c, o, tmp, ext, keys=[], pattern='', arr = str.split('/');
    	arr[0] || arr.shift();

    	while (tmp = arr.shift()) {
    		c = tmp[0];
    		if (c === '*') {
    			keys.push('wild');
    			pattern += '/(.*)';
    		} else if (c === ':') {
    			o = tmp.indexOf('?', 1);
    			ext = tmp.indexOf('.', 1);
    			keys.push( tmp.substring(1, !!~o ? o : !!~ext ? ext : tmp.length) );
    			pattern += !!~o && !~ext ? '(?:/([^/]+?))?' : '/([^/]+?)';
    			if (!!~ext) pattern += (!!~o ? '?' : '') + '\\' + tmp.substring(ext);
    		} else {
    			pattern += '/' + tmp;
    		}
    	}

    	return {
    		keys: keys,
    		pattern: new RegExp('^' + pattern + (loose ? '(?=$|\/)' : '\/?$'), 'i')
    	};
    }

    /* node_modules\svelte-spa-router\Router.svelte generated by Svelte v3.59.2 */

    const { Error: Error_1, Object: Object_1, console: console_1$7 } = globals;

    // (246:0) {:else}
    function create_else_block$6(ctx) {
    	let switch_instance;
    	let switch_instance_anchor;
    	let current;
    	const switch_instance_spread_levels = [/*props*/ ctx[2]];
    	var switch_value = /*component*/ ctx[0];

    	function switch_props(ctx) {
    		let switch_instance_props = {};

    		for (let i = 0; i < switch_instance_spread_levels.length; i += 1) {
    			switch_instance_props = assign(switch_instance_props, switch_instance_spread_levels[i]);
    		}

    		return {
    			props: switch_instance_props,
    			$$inline: true
    		};
    	}

    	if (switch_value) {
    		switch_instance = construct_svelte_component_dev(switch_value, switch_props());
    		switch_instance.$on("routeEvent", /*routeEvent_handler_1*/ ctx[7]);
    	}

    	const block = {
    		c: function create() {
    			if (switch_instance) create_component(switch_instance.$$.fragment);
    			switch_instance_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if (switch_instance) mount_component(switch_instance, target, anchor);
    			insert_dev(target, switch_instance_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const switch_instance_changes = (dirty & /*props*/ 4)
    			? get_spread_update(switch_instance_spread_levels, [get_spread_object(/*props*/ ctx[2])])
    			: {};

    			if (dirty & /*component*/ 1 && switch_value !== (switch_value = /*component*/ ctx[0])) {
    				if (switch_instance) {
    					group_outros();
    					const old_component = switch_instance;

    					transition_out(old_component.$$.fragment, 1, 0, () => {
    						destroy_component(old_component, 1);
    					});

    					check_outros();
    				}

    				if (switch_value) {
    					switch_instance = construct_svelte_component_dev(switch_value, switch_props());
    					switch_instance.$on("routeEvent", /*routeEvent_handler_1*/ ctx[7]);
    					create_component(switch_instance.$$.fragment);
    					transition_in(switch_instance.$$.fragment, 1);
    					mount_component(switch_instance, switch_instance_anchor.parentNode, switch_instance_anchor);
    				} else {
    					switch_instance = null;
    				}
    			} else if (switch_value) {
    				switch_instance.$set(switch_instance_changes);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			if (switch_instance) transition_in(switch_instance.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			if (switch_instance) transition_out(switch_instance.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(switch_instance_anchor);
    			if (switch_instance) destroy_component(switch_instance, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block$6.name,
    		type: "else",
    		source: "(246:0) {:else}",
    		ctx
    	});

    	return block;
    }

    // (239:0) {#if componentParams}
    function create_if_block$8(ctx) {
    	let switch_instance;
    	let switch_instance_anchor;
    	let current;
    	const switch_instance_spread_levels = [{ params: /*componentParams*/ ctx[1] }, /*props*/ ctx[2]];
    	var switch_value = /*component*/ ctx[0];

    	function switch_props(ctx) {
    		let switch_instance_props = {};

    		for (let i = 0; i < switch_instance_spread_levels.length; i += 1) {
    			switch_instance_props = assign(switch_instance_props, switch_instance_spread_levels[i]);
    		}

    		return {
    			props: switch_instance_props,
    			$$inline: true
    		};
    	}

    	if (switch_value) {
    		switch_instance = construct_svelte_component_dev(switch_value, switch_props());
    		switch_instance.$on("routeEvent", /*routeEvent_handler*/ ctx[6]);
    	}

    	const block = {
    		c: function create() {
    			if (switch_instance) create_component(switch_instance.$$.fragment);
    			switch_instance_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if (switch_instance) mount_component(switch_instance, target, anchor);
    			insert_dev(target, switch_instance_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const switch_instance_changes = (dirty & /*componentParams, props*/ 6)
    			? get_spread_update(switch_instance_spread_levels, [
    					dirty & /*componentParams*/ 2 && { params: /*componentParams*/ ctx[1] },
    					dirty & /*props*/ 4 && get_spread_object(/*props*/ ctx[2])
    				])
    			: {};

    			if (dirty & /*component*/ 1 && switch_value !== (switch_value = /*component*/ ctx[0])) {
    				if (switch_instance) {
    					group_outros();
    					const old_component = switch_instance;

    					transition_out(old_component.$$.fragment, 1, 0, () => {
    						destroy_component(old_component, 1);
    					});

    					check_outros();
    				}

    				if (switch_value) {
    					switch_instance = construct_svelte_component_dev(switch_value, switch_props());
    					switch_instance.$on("routeEvent", /*routeEvent_handler*/ ctx[6]);
    					create_component(switch_instance.$$.fragment);
    					transition_in(switch_instance.$$.fragment, 1);
    					mount_component(switch_instance, switch_instance_anchor.parentNode, switch_instance_anchor);
    				} else {
    					switch_instance = null;
    				}
    			} else if (switch_value) {
    				switch_instance.$set(switch_instance_changes);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			if (switch_instance) transition_in(switch_instance.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			if (switch_instance) transition_out(switch_instance.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(switch_instance_anchor);
    			if (switch_instance) destroy_component(switch_instance, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$8.name,
    		type: "if",
    		source: "(239:0) {#if componentParams}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$j(ctx) {
    	let current_block_type_index;
    	let if_block;
    	let if_block_anchor;
    	let current;
    	const if_block_creators = [create_if_block$8, create_else_block$6];
    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (/*componentParams*/ ctx[1]) return 0;
    		return 1;
    	}

    	current_block_type_index = select_block_type(ctx);
    	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	const block = {
    		c: function create() {
    			if_block.c();
    			if_block_anchor = empty();
    		},
    		l: function claim(nodes) {
    			throw new Error_1("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			if_blocks[current_block_type_index].m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(ctx);

    			if (current_block_type_index === previous_block_index) {
    				if_blocks[current_block_type_index].p(ctx, dirty);
    			} else {
    				group_outros();

    				transition_out(if_blocks[previous_block_index], 1, 1, () => {
    					if_blocks[previous_block_index] = null;
    				});

    				check_outros();
    				if_block = if_blocks[current_block_type_index];

    				if (!if_block) {
    					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block.c();
    				} else {
    					if_block.p(ctx, dirty);
    				}

    				transition_in(if_block, 1);
    				if_block.m(if_block_anchor.parentNode, if_block_anchor);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if_blocks[current_block_type_index].d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$j.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function getLocation() {
    	const hashPosition = window.location.href.indexOf('#/');

    	let location = hashPosition > -1
    	? window.location.href.substr(hashPosition + 1)
    	: '/';

    	// Check if there's a querystring
    	const qsPosition = location.indexOf('?');

    	let querystring = '';

    	if (qsPosition > -1) {
    		querystring = location.substr(qsPosition + 1);
    		location = location.substr(0, qsPosition);
    	}

    	return { location, querystring };
    }

    const loc = readable(null, // eslint-disable-next-line prefer-arrow-callback
    function start(set) {
    	set(getLocation());

    	const update = () => {
    		set(getLocation());
    	};

    	window.addEventListener('hashchange', update, false);

    	return function stop() {
    		window.removeEventListener('hashchange', update, false);
    	};
    });

    const location = derived(loc, _loc => _loc.location);
    const querystring = derived(loc, _loc => _loc.querystring);
    const params = writable(undefined);

    async function push(location) {
    	if (!location || location.length < 1 || location.charAt(0) != '/' && location.indexOf('#/') !== 0) {
    		throw Error('Invalid parameter location');
    	}

    	// Execute this code when the current call stack is complete
    	await tick();

    	// Note: this will include scroll state in history even when restoreScrollState is false
    	history.replaceState(
    		{
    			...history.state,
    			__svelte_spa_router_scrollX: window.scrollX,
    			__svelte_spa_router_scrollY: window.scrollY
    		},
    		undefined
    	);

    	window.location.hash = (location.charAt(0) == '#' ? '' : '#') + location;
    }

    async function pop() {
    	// Execute this code when the current call stack is complete
    	await tick();

    	window.history.back();
    }

    async function replace(location) {
    	if (!location || location.length < 1 || location.charAt(0) != '/' && location.indexOf('#/') !== 0) {
    		throw Error('Invalid parameter location');
    	}

    	// Execute this code when the current call stack is complete
    	await tick();

    	const dest = (location.charAt(0) == '#' ? '' : '#') + location;

    	try {
    		const newState = { ...history.state };
    		delete newState['__svelte_spa_router_scrollX'];
    		delete newState['__svelte_spa_router_scrollY'];
    		window.history.replaceState(newState, undefined, dest);
    	} catch(e) {
    		// eslint-disable-next-line no-console
    		console.warn('Caught exception while replacing the current page. If you\'re running this in the Svelte REPL, please note that the `replace` method might not work in this environment.');
    	}

    	// The method above doesn't trigger the hashchange event, so let's do that manually
    	window.dispatchEvent(new Event('hashchange'));
    }

    function link(node, opts) {
    	opts = linkOpts(opts);

    	// Only apply to <a> tags
    	if (!node || !node.tagName || node.tagName.toLowerCase() != 'a') {
    		throw Error('Action "link" can only be used with <a> tags');
    	}

    	updateLink(node, opts);

    	return {
    		update(updated) {
    			updated = linkOpts(updated);
    			updateLink(node, updated);
    		}
    	};
    }

    function restoreScroll(state) {
    	// If this exists, then this is a back navigation: restore the scroll position
    	if (state) {
    		window.scrollTo(state.__svelte_spa_router_scrollX, state.__svelte_spa_router_scrollY);
    	} else {
    		// Otherwise this is a forward navigation: scroll to top
    		window.scrollTo(0, 0);
    	}
    }

    // Internal function used by the link function
    function updateLink(node, opts) {
    	let href = opts.href || node.getAttribute('href');

    	// Destination must start with '/' or '#/'
    	if (href && href.charAt(0) == '/') {
    		// Add # to the href attribute
    		href = '#' + href;
    	} else if (!href || href.length < 2 || href.slice(0, 2) != '#/') {
    		throw Error('Invalid value for "href" attribute: ' + href);
    	}

    	node.setAttribute('href', href);

    	node.addEventListener('click', event => {
    		// Prevent default anchor onclick behaviour
    		event.preventDefault();

    		if (!opts.disabled) {
    			scrollstateHistoryHandler(event.currentTarget.getAttribute('href'));
    		}
    	});
    }

    // Internal function that ensures the argument of the link action is always an object
    function linkOpts(val) {
    	if (val && typeof val == 'string') {
    		return { href: val };
    	} else {
    		return val || {};
    	}
    }

    /**
     * The handler attached to an anchor tag responsible for updating the
     * current history state with the current scroll state
     *
     * @param {string} href - Destination
     */
    function scrollstateHistoryHandler(href) {
    	// Setting the url (3rd arg) to href will break clicking for reasons, so don't try to do that
    	history.replaceState(
    		{
    			...history.state,
    			__svelte_spa_router_scrollX: window.scrollX,
    			__svelte_spa_router_scrollY: window.scrollY
    		},
    		undefined
    	);

    	// This will force an update as desired, but this time our scroll state will be attached
    	window.location.hash = href;
    }

    function instance$j($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Router', slots, []);
    	let { routes = {} } = $$props;
    	let { prefix = '' } = $$props;
    	let { restoreScrollState = false } = $$props;

    	/**
     * Container for a route: path, component
     */
    	class RouteItem {
    		/**
     * Initializes the object and creates a regular expression from the path, using regexparam.
     *
     * @param {string} path - Path to the route (must start with '/' or '*')
     * @param {SvelteComponent|WrappedComponent} component - Svelte component for the route, optionally wrapped
     */
    		constructor(path, component) {
    			if (!component || typeof component != 'function' && (typeof component != 'object' || component._sveltesparouter !== true)) {
    				throw Error('Invalid component object');
    			}

    			// Path must be a regular or expression, or a string starting with '/' or '*'
    			if (!path || typeof path == 'string' && (path.length < 1 || path.charAt(0) != '/' && path.charAt(0) != '*') || typeof path == 'object' && !(path instanceof RegExp)) {
    				throw Error('Invalid value for "path" argument - strings must start with / or *');
    			}

    			const { pattern, keys } = parse(path);
    			this.path = path;

    			// Check if the component is wrapped and we have conditions
    			if (typeof component == 'object' && component._sveltesparouter === true) {
    				this.component = component.component;
    				this.conditions = component.conditions || [];
    				this.userData = component.userData;
    				this.props = component.props || {};
    			} else {
    				// Convert the component to a function that returns a Promise, to normalize it
    				this.component = () => Promise.resolve(component);

    				this.conditions = [];
    				this.props = {};
    			}

    			this._pattern = pattern;
    			this._keys = keys;
    		}

    		/**
     * Checks if `path` matches the current route.
     * If there's a match, will return the list of parameters from the URL (if any).
     * In case of no match, the method will return `null`.
     *
     * @param {string} path - Path to test
     * @returns {null|Object.<string, string>} List of paramters from the URL if there's a match, or `null` otherwise.
     */
    		match(path) {
    			// If there's a prefix, check if it matches the start of the path.
    			// If not, bail early, else remove it before we run the matching.
    			if (prefix) {
    				if (typeof prefix == 'string') {
    					if (path.startsWith(prefix)) {
    						path = path.substr(prefix.length) || '/';
    					} else {
    						return null;
    					}
    				} else if (prefix instanceof RegExp) {
    					const match = path.match(prefix);

    					if (match && match[0]) {
    						path = path.substr(match[0].length) || '/';
    					} else {
    						return null;
    					}
    				}
    			}

    			// Check if the pattern matches
    			const matches = this._pattern.exec(path);

    			if (matches === null) {
    				return null;
    			}

    			// If the input was a regular expression, this._keys would be false, so return matches as is
    			if (this._keys === false) {
    				return matches;
    			}

    			const out = {};
    			let i = 0;

    			while (i < this._keys.length) {
    				// In the match parameters, URL-decode all values
    				try {
    					out[this._keys[i]] = decodeURIComponent(matches[i + 1] || '') || null;
    				} catch(e) {
    					out[this._keys[i]] = null;
    				}

    				i++;
    			}

    			return out;
    		}

    		/**
     * Dictionary with route details passed to the pre-conditions functions, as well as the `routeLoading`, `routeLoaded` and `conditionsFailed` events
     * @typedef {Object} RouteDetail
     * @property {string|RegExp} route - Route matched as defined in the route definition (could be a string or a reguar expression object)
     * @property {string} location - Location path
     * @property {string} querystring - Querystring from the hash
     * @property {object} [userData] - Custom data passed by the user
     * @property {SvelteComponent} [component] - Svelte component (only in `routeLoaded` events)
     * @property {string} [name] - Name of the Svelte component (only in `routeLoaded` events)
     */
    		/**
     * Executes all conditions (if any) to control whether the route can be shown. Conditions are executed in the order they are defined, and if a condition fails, the following ones aren't executed.
     * 
     * @param {RouteDetail} detail - Route detail
     * @returns {boolean} Returns true if all the conditions succeeded
     */
    		async checkConditions(detail) {
    			for (let i = 0; i < this.conditions.length; i++) {
    				if (!await this.conditions[i](detail)) {
    					return false;
    				}
    			}

    			return true;
    		}
    	}

    	// Set up all routes
    	const routesList = [];

    	if (routes instanceof Map) {
    		// If it's a map, iterate on it right away
    		routes.forEach((route, path) => {
    			routesList.push(new RouteItem(path, route));
    		});
    	} else {
    		// We have an object, so iterate on its own properties
    		Object.keys(routes).forEach(path => {
    			routesList.push(new RouteItem(path, routes[path]));
    		});
    	}

    	// Props for the component to render
    	let component = null;

    	let componentParams = null;
    	let props = {};

    	// Event dispatcher from Svelte
    	const dispatch = createEventDispatcher();

    	// Just like dispatch, but executes on the next iteration of the event loop
    	async function dispatchNextTick(name, detail) {
    		// Execute this code when the current call stack is complete
    		await tick();

    		dispatch(name, detail);
    	}

    	// If this is set, then that means we have popped into this var the state of our last scroll position
    	let previousScrollState = null;

    	let popStateChanged = null;

    	if (restoreScrollState) {
    		popStateChanged = event => {
    			// If this event was from our history.replaceState, event.state will contain
    			// our scroll history. Otherwise, event.state will be null (like on forward
    			// navigation)
    			if (event.state && (event.state.__svelte_spa_router_scrollY || event.state.__svelte_spa_router_scrollX)) {
    				previousScrollState = event.state;
    			} else {
    				previousScrollState = null;
    			}
    		};

    		// This is removed in the destroy() invocation below
    		window.addEventListener('popstate', popStateChanged);

    		afterUpdate(() => {
    			restoreScroll(previousScrollState);
    		});
    	}

    	// Always have the latest value of loc
    	let lastLoc = null;

    	// Current object of the component loaded
    	let componentObj = null;

    	// Handle hash change events
    	// Listen to changes in the $loc store and update the page
    	// Do not use the $: syntax because it gets triggered by too many things
    	const unsubscribeLoc = loc.subscribe(async newLoc => {
    		lastLoc = newLoc;

    		// Find a route matching the location
    		let i = 0;

    		while (i < routesList.length) {
    			const match = routesList[i].match(newLoc.location);

    			if (!match) {
    				i++;
    				continue;
    			}

    			const detail = {
    				route: routesList[i].path,
    				location: newLoc.location,
    				querystring: newLoc.querystring,
    				userData: routesList[i].userData,
    				params: match && typeof match == 'object' && Object.keys(match).length
    				? match
    				: null
    			};

    			// Check if the route can be loaded - if all conditions succeed
    			if (!await routesList[i].checkConditions(detail)) {
    				// Don't display anything
    				$$invalidate(0, component = null);

    				componentObj = null;

    				// Trigger an event to notify the user, then exit
    				dispatchNextTick('conditionsFailed', detail);

    				return;
    			}

    			// Trigger an event to alert that we're loading the route
    			// We need to clone the object on every event invocation so we don't risk the object to be modified in the next tick
    			dispatchNextTick('routeLoading', Object.assign({}, detail));

    			// If there's a component to show while we're loading the route, display it
    			const obj = routesList[i].component;

    			// Do not replace the component if we're loading the same one as before, to avoid the route being unmounted and re-mounted
    			if (componentObj != obj) {
    				if (obj.loading) {
    					$$invalidate(0, component = obj.loading);
    					componentObj = obj;
    					$$invalidate(1, componentParams = obj.loadingParams);
    					$$invalidate(2, props = {});

    					// Trigger the routeLoaded event for the loading component
    					// Create a copy of detail so we don't modify the object for the dynamic route (and the dynamic route doesn't modify our object too)
    					dispatchNextTick('routeLoaded', Object.assign({}, detail, {
    						component,
    						name: component.name,
    						params: componentParams
    					}));
    				} else {
    					$$invalidate(0, component = null);
    					componentObj = null;
    				}

    				// Invoke the Promise
    				const loaded = await obj();

    				// Now that we're here, after the promise resolved, check if we still want this component, as the user might have navigated to another page in the meanwhile
    				if (newLoc != lastLoc) {
    					// Don't update the component, just exit
    					return;
    				}

    				// If there is a "default" property, which is used by async routes, then pick that
    				$$invalidate(0, component = loaded && loaded.default || loaded);

    				componentObj = obj;
    			}

    			// Set componentParams only if we have a match, to avoid a warning similar to `<Component> was created with unknown prop 'params'`
    			// Of course, this assumes that developers always add a "params" prop when they are expecting parameters
    			if (match && typeof match == 'object' && Object.keys(match).length) {
    				$$invalidate(1, componentParams = match);
    			} else {
    				$$invalidate(1, componentParams = null);
    			}

    			// Set static props, if any
    			$$invalidate(2, props = routesList[i].props);

    			// Dispatch the routeLoaded event then exit
    			// We need to clone the object on every event invocation so we don't risk the object to be modified in the next tick
    			dispatchNextTick('routeLoaded', Object.assign({}, detail, {
    				component,
    				name: component.name,
    				params: componentParams
    			})).then(() => {
    				params.set(componentParams);
    			});

    			return;
    		}

    		// If we're still here, there was no match, so show the empty component
    		$$invalidate(0, component = null);

    		componentObj = null;
    		params.set(undefined);
    	});

    	onDestroy(() => {
    		unsubscribeLoc();
    		popStateChanged && window.removeEventListener('popstate', popStateChanged);
    	});

    	const writable_props = ['routes', 'prefix', 'restoreScrollState'];

    	Object_1.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console_1$7.warn(`<Router> was created with unknown prop '${key}'`);
    	});

    	function routeEvent_handler(event) {
    		bubble.call(this, $$self, event);
    	}

    	function routeEvent_handler_1(event) {
    		bubble.call(this, $$self, event);
    	}

    	$$self.$$set = $$props => {
    		if ('routes' in $$props) $$invalidate(3, routes = $$props.routes);
    		if ('prefix' in $$props) $$invalidate(4, prefix = $$props.prefix);
    		if ('restoreScrollState' in $$props) $$invalidate(5, restoreScrollState = $$props.restoreScrollState);
    	};

    	$$self.$capture_state = () => ({
    		readable,
    		writable,
    		derived,
    		tick,
    		getLocation,
    		loc,
    		location,
    		querystring,
    		params,
    		push,
    		pop,
    		replace,
    		link,
    		restoreScroll,
    		updateLink,
    		linkOpts,
    		scrollstateHistoryHandler,
    		onDestroy,
    		createEventDispatcher,
    		afterUpdate,
    		parse,
    		routes,
    		prefix,
    		restoreScrollState,
    		RouteItem,
    		routesList,
    		component,
    		componentParams,
    		props,
    		dispatch,
    		dispatchNextTick,
    		previousScrollState,
    		popStateChanged,
    		lastLoc,
    		componentObj,
    		unsubscribeLoc
    	});

    	$$self.$inject_state = $$props => {
    		if ('routes' in $$props) $$invalidate(3, routes = $$props.routes);
    		if ('prefix' in $$props) $$invalidate(4, prefix = $$props.prefix);
    		if ('restoreScrollState' in $$props) $$invalidate(5, restoreScrollState = $$props.restoreScrollState);
    		if ('component' in $$props) $$invalidate(0, component = $$props.component);
    		if ('componentParams' in $$props) $$invalidate(1, componentParams = $$props.componentParams);
    		if ('props' in $$props) $$invalidate(2, props = $$props.props);
    		if ('previousScrollState' in $$props) previousScrollState = $$props.previousScrollState;
    		if ('popStateChanged' in $$props) popStateChanged = $$props.popStateChanged;
    		if ('lastLoc' in $$props) lastLoc = $$props.lastLoc;
    		if ('componentObj' in $$props) componentObj = $$props.componentObj;
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*restoreScrollState*/ 32) {
    			// Update history.scrollRestoration depending on restoreScrollState
    			history.scrollRestoration = restoreScrollState ? 'manual' : 'auto';
    		}
    	};

    	return [
    		component,
    		componentParams,
    		props,
    		routes,
    		prefix,
    		restoreScrollState,
    		routeEvent_handler,
    		routeEvent_handler_1
    	];
    }

    class Router extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance$j, create_fragment$j, safe_not_equal, {
    			routes: 3,
    			prefix: 4,
    			restoreScrollState: 5
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Router",
    			options,
    			id: create_fragment$j.name
    		});
    	}

    	get routes() {
    		throw new Error_1("<Router>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set routes(value) {
    		throw new Error_1("<Router>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get prefix() {
    		throw new Error_1("<Router>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set prefix(value) {
    		throw new Error_1("<Router>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get restoreScrollState() {
    		throw new Error_1("<Router>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set restoreScrollState(value) {
    		throw new Error_1("<Router>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    const notifications = writable([]);

    function notify(message, type = 'info', duration = 3000) {
        const id = Math.random().toString(36).substr(2, 9);
        notifications.update(n => [...n, { id, message, type }]);

        if (duration) {
            setTimeout(() => {
                dismissNotification(id);
            }, duration);
        }
    }

    function dismissNotification(id) {
        notifications.update(n => n.filter(m => m.id !== id));
    }

    /* src\pages\auth\Forgot.svelte generated by Svelte v3.59.2 */

    const { console: console_1$6 } = globals;
    const file$h = "src\\pages\\auth\\Forgot.svelte";

    function create_fragment$i(ctx) {
    	let h2;
    	let t1;
    	let form;
    	let input;
    	let t2;
    	let br;
    	let t3;
    	let button;
    	let t5;
    	let div;
    	let a;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			h2 = element("h2");
    			h2.textContent = "Forgot Password";
    			t1 = space();
    			form = element("form");
    			input = element("input");
    			t2 = space();
    			br = element("br");
    			t3 = space();
    			button = element("button");
    			button.textContent = "Send Password Reset Email";
    			t5 = space();
    			div = element("div");
    			a = element("a");
    			a.textContent = "← Go Back to Login";
    			add_location(h2, file$h, 33, 0, 999);
    			attr_dev(input, "type", "email");
    			attr_dev(input, "placeholder", "Email address");
    			input.required = true;
    			add_location(input, file$h, 35, 4, 1072);
    			add_location(br, file$h, 36, 4, 1153);
    			attr_dev(button, "type", "submit");
    			add_location(button, file$h, 37, 4, 1162);
    			add_location(form, file$h, 34, 0, 1024);
    			attr_dev(a, "href", "/#/auth/login");
    			add_location(a, file$h, 40, 4, 1257);
    			attr_dev(div, "class", "extra-links");
    			add_location(div, file$h, 39, 0, 1227);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, h2, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, form, anchor);
    			append_dev(form, input);
    			set_input_value(input, /*email*/ ctx[0]);
    			append_dev(form, t2);
    			append_dev(form, br);
    			append_dev(form, t3);
    			append_dev(form, button);
    			insert_dev(target, t5, anchor);
    			insert_dev(target, div, anchor);
    			append_dev(div, a);

    			if (!mounted) {
    				dispose = [
    					listen_dev(input, "input", /*input_input_handler*/ ctx[2]),
    					listen_dev(form, "submit", prevent_default(/*sendReset*/ ctx[1]), false, true, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*email*/ 1 && input.value !== /*email*/ ctx[0]) {
    				set_input_value(input, /*email*/ ctx[0]);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(h2);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(form);
    			if (detaching) detach_dev(t5);
    			if (detaching) detach_dev(div);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$i.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$i($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Forgot', slots, []);
    	let email = '';

    	async function sendReset() {
    		if (!email) {
    			notify('Please enter your email address.', 'info');
    			return;
    		}

    		try {
    			const res = await fetch('http://127.0.0.1:3000/api/auth/forgot', {
    				method: 'POST',
    				headers: { 'Content-Type': 'application/json' },
    				body: JSON.stringify({ email })
    			});

    			const { message, success } = await res.json();

    			if (success) {
    				notify(message, 'success');
    				replace('/auth/login');
    			} else {
    				notify(message, 'error');
    			}
    		} catch(error) {
    			console.error('Forgot error:', error);
    			notify('An error occurred. Please try again.', 'error');
    		}
    	}

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console_1$6.warn(`<Forgot> was created with unknown prop '${key}'`);
    	});

    	function input_input_handler() {
    		email = this.value;
    		$$invalidate(0, email);
    	}

    	$$self.$capture_state = () => ({ replace, notify, email, sendReset });

    	$$self.$inject_state = $$props => {
    		if ('email' in $$props) $$invalidate(0, email = $$props.email);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [email, sendReset, input_input_handler];
    }

    class Forgot extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$i, create_fragment$i, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Forgot",
    			options,
    			id: create_fragment$i.name
    		});
    	}
    }

    function cubicOut(t) {
        const f = t - 1.0;
        return f * f * f + 1.0;
    }

    function fade(node, { delay = 0, duration = 400, easing = identity } = {}) {
        const o = +getComputedStyle(node).opacity;
        return {
            delay,
            duration,
            easing,
            css: t => `opacity: ${t * o}`
        };
    }
    function fly(node, { delay = 0, duration = 400, easing = cubicOut, x = 0, y = 0, opacity = 0 } = {}) {
        const style = getComputedStyle(node);
        const target_opacity = +style.opacity;
        const transform = style.transform === 'none' ? '' : style.transform;
        const od = target_opacity * (1 - opacity);
        const [xValue, xUnit] = split_css_unit(x);
        const [yValue, yUnit] = split_css_unit(y);
        return {
            delay,
            duration,
            easing,
            css: (t, u) => `
			transform: ${transform} translate(${(1 - t) * xValue}${xUnit}, ${(1 - t) * yValue}${yUnit});
			opacity: ${target_opacity - (od * u)}`
        };
    }
    function slide(node, { delay = 0, duration = 400, easing = cubicOut, axis = 'y' } = {}) {
        const style = getComputedStyle(node);
        const opacity = +style.opacity;
        const primary_property = axis === 'y' ? 'height' : 'width';
        const primary_property_value = parseFloat(style[primary_property]);
        const secondary_properties = axis === 'y' ? ['top', 'bottom'] : ['left', 'right'];
        const capitalized_secondary_properties = secondary_properties.map((e) => `${e[0].toUpperCase()}${e.slice(1)}`);
        const padding_start_value = parseFloat(style[`padding${capitalized_secondary_properties[0]}`]);
        const padding_end_value = parseFloat(style[`padding${capitalized_secondary_properties[1]}`]);
        const margin_start_value = parseFloat(style[`margin${capitalized_secondary_properties[0]}`]);
        const margin_end_value = parseFloat(style[`margin${capitalized_secondary_properties[1]}`]);
        const border_width_start_value = parseFloat(style[`border${capitalized_secondary_properties[0]}Width`]);
        const border_width_end_value = parseFloat(style[`border${capitalized_secondary_properties[1]}Width`]);
        return {
            delay,
            duration,
            easing,
            css: t => 'overflow: hidden;' +
                `opacity: ${Math.min(t * 20, 1) * opacity};` +
                `${primary_property}: ${t * primary_property_value}px;` +
                `padding-${secondary_properties[0]}: ${t * padding_start_value}px;` +
                `padding-${secondary_properties[1]}: ${t * padding_end_value}px;` +
                `margin-${secondary_properties[0]}: ${t * margin_start_value}px;` +
                `margin-${secondary_properties[1]}: ${t * margin_end_value}px;` +
                `border-${secondary_properties[0]}-width: ${t * border_width_start_value}px;` +
                `border-${secondary_properties[1]}-width: ${t * border_width_end_value}px;`
        };
    }

    /* src\pages\auth\Login.svelte generated by Svelte v3.59.2 */

    const { console: console_1$5 } = globals;
    const file$g = "src\\pages\\auth\\Login.svelte";

    function create_fragment$h(ctx) {
    	let div8;
    	let div7;
    	let div5;
    	let div0;
    	let h2;
    	let t1;
    	let p0;
    	let t3;
    	let div1;
    	let button0;
    	let t5;
    	let button1;
    	let t7;
    	let form;
    	let div2;
    	let label0;
    	let t9;
    	let input0;
    	let t10;
    	let div3;
    	let label1;
    	let t12;
    	let input1;
    	let t13;
    	let button2;
    	let t15;
    	let div4;
    	let p1;
    	let t16;
    	let a0;
    	let t18;
    	let a1;
    	let t20;
    	let div6;
    	let img;
    	let img_src_value;
    	let t21;
    	let h3;
    	let t23;
    	let p2;
    	let div8_intro;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div8 = element("div");
    			div7 = element("div");
    			div5 = element("div");
    			div0 = element("div");
    			h2 = element("h2");
    			h2.textContent = "Welcome Back";
    			t1 = space();
    			p0 = element("p");
    			p0.textContent = "Sign in to access your dashboard";
    			t3 = space();
    			div1 = element("div");
    			button0 = element("button");
    			button0.textContent = "👤 Candidate";
    			t5 = space();
    			button1 = element("button");
    			button1.textContent = "🏢 Recruiter";
    			t7 = space();
    			form = element("form");
    			div2 = element("div");
    			label0 = element("label");
    			label0.textContent = "Email Address";
    			t9 = space();
    			input0 = element("input");
    			t10 = space();
    			div3 = element("div");
    			label1 = element("label");
    			label1.textContent = "Password";
    			t12 = space();
    			input1 = element("input");
    			t13 = space();
    			button2 = element("button");
    			button2.textContent = "Sign In";
    			t15 = space();
    			div4 = element("div");
    			p1 = element("p");
    			t16 = text("Don't have an account? ");
    			a0 = element("a");
    			a0.textContent = "Create Account";
    			t18 = space();
    			a1 = element("a");
    			a1.textContent = "Forgot Password?";
    			t20 = space();
    			div6 = element("div");
    			img = element("img");
    			t21 = space();
    			h3 = element("h3");
    			h3.textContent = "Enterprise-Grade AI Ranking";
    			t23 = space();
    			p2 = element("p");
    			p2.textContent = "Join thousands of recruiters finding the best talent in seconds with TalentScanAI.";
    			add_location(h2, file$g, 44, 16, 1613);
    			add_location(p0, file$g, 45, 16, 1651);
    			attr_dev(div0, "class", "auth-header");
    			add_location(div0, file$g, 43, 12, 1571);
    			attr_dev(button0, "class", "role-btn");
    			toggle_class(button0, "active", /*role*/ ctx[2] === 'candidate');
    			add_location(button0, file$g, 50, 16, 1800);
    			attr_dev(button1, "class", "role-btn");
    			toggle_class(button1, "active", /*role*/ ctx[2] === 'recruiter');
    			add_location(button1, file$g, 57, 16, 2053);
    			attr_dev(div1, "class", "role-toggle");
    			add_location(div1, file$g, 49, 12, 1758);
    			attr_dev(label0, "for", "email");
    			add_location(label0, file$g, 68, 20, 2424);
    			attr_dev(input0, "type", "email");
    			attr_dev(input0, "id", "email");
    			attr_dev(input0, "placeholder", "e.g. bilal@example.com");
    			input0.required = true;
    			add_location(input0, file$g, 69, 20, 2485);
    			attr_dev(div2, "class", "input-group");
    			add_location(div2, file$g, 67, 16, 2378);
    			attr_dev(label1, "for", "password");
    			add_location(label1, file$g, 79, 20, 2831);
    			attr_dev(input1, "type", "password");
    			attr_dev(input1, "id", "password");
    			attr_dev(input1, "placeholder", "••••••••");
    			input1.required = true;
    			add_location(input1, file$g, 80, 20, 2890);
    			attr_dev(div3, "class", "input-group");
    			add_location(div3, file$g, 78, 16, 2785);
    			attr_dev(button2, "type", "submit");
    			attr_dev(button2, "class", "submit-btn");
    			add_location(button2, file$g, 89, 16, 3169);
    			add_location(form, file$g, 66, 12, 2322);
    			attr_dev(a0, "href", "/#/auth/signup");
    			add_location(a0, file$g, 93, 42, 3328);
    			add_location(p1, file$g, 93, 16, 3302);
    			attr_dev(a1, "href", "/#/auth/forgot");
    			set_style(a1, "display", "block");
    			set_style(a1, "margin-top", "15px");
    			set_style(a1, "font-weight", "500");
    			set_style(a1, "font-size", "13px");
    			add_location(a1, file$g, 94, 16, 3392);
    			attr_dev(div4, "class", "extra-links");
    			add_location(div4, file$g, 92, 12, 3260);
    			attr_dev(div5, "class", "auth-form-section");
    			add_location(div5, file$g, 42, 8, 1527);
    			if (!src_url_equal(img.src, img_src_value = "imgs/front.png")) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", "Login Graphic");
    			add_location(img, file$g, 99, 12, 3603);
    			add_location(h3, file$g, 100, 12, 3662);
    			set_style(p2, "opacity", "0.8");
    			set_style(p2, "margin-top", "10px");
    			set_style(p2, "font-size", "14px");
    			add_location(p2, file$g, 101, 12, 3711);
    			attr_dev(div6, "class", "auth-image-section");
    			add_location(div6, file$g, 98, 8, 3558);
    			attr_dev(div7, "class", "auth-container");
    			add_location(div7, file$g, 41, 4, 1490);
    			attr_dev(div8, "class", "auth-wrapper");
    			add_location(div8, file$g, 40, 0, 1451);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div8, anchor);
    			append_dev(div8, div7);
    			append_dev(div7, div5);
    			append_dev(div5, div0);
    			append_dev(div0, h2);
    			append_dev(div0, t1);
    			append_dev(div0, p0);
    			append_dev(div5, t3);
    			append_dev(div5, div1);
    			append_dev(div1, button0);
    			append_dev(div1, t5);
    			append_dev(div1, button1);
    			append_dev(div5, t7);
    			append_dev(div5, form);
    			append_dev(form, div2);
    			append_dev(div2, label0);
    			append_dev(div2, t9);
    			append_dev(div2, input0);
    			set_input_value(input0, /*email*/ ctx[0]);
    			append_dev(form, t10);
    			append_dev(form, div3);
    			append_dev(div3, label1);
    			append_dev(div3, t12);
    			append_dev(div3, input1);
    			set_input_value(input1, /*password*/ ctx[1]);
    			append_dev(form, t13);
    			append_dev(form, button2);
    			append_dev(div5, t15);
    			append_dev(div5, div4);
    			append_dev(div4, p1);
    			append_dev(p1, t16);
    			append_dev(p1, a0);
    			append_dev(div4, t18);
    			append_dev(div4, a1);
    			append_dev(div7, t20);
    			append_dev(div7, div6);
    			append_dev(div6, img);
    			append_dev(div6, t21);
    			append_dev(div6, h3);
    			append_dev(div6, t23);
    			append_dev(div6, p2);

    			if (!mounted) {
    				dispose = [
    					listen_dev(button0, "click", /*click_handler*/ ctx[4], false, false, false, false),
    					listen_dev(button1, "click", /*click_handler_1*/ ctx[5], false, false, false, false),
    					listen_dev(input0, "input", /*input0_input_handler*/ ctx[6]),
    					listen_dev(input1, "input", /*input1_input_handler*/ ctx[7]),
    					listen_dev(form, "submit", prevent_default(/*login*/ ctx[3]), false, true, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*role*/ 4) {
    				toggle_class(button0, "active", /*role*/ ctx[2] === 'candidate');
    			}

    			if (dirty & /*role*/ 4) {
    				toggle_class(button1, "active", /*role*/ ctx[2] === 'recruiter');
    			}

    			if (dirty & /*email*/ 1 && input0.value !== /*email*/ ctx[0]) {
    				set_input_value(input0, /*email*/ ctx[0]);
    			}

    			if (dirty & /*password*/ 2 && input1.value !== /*password*/ ctx[1]) {
    				set_input_value(input1, /*password*/ ctx[1]);
    			}
    		},
    		i: function intro(local) {
    			if (!div8_intro) {
    				add_render_callback(() => {
    					div8_intro = create_in_transition(div8, fade, {});
    					div8_intro.start();
    				});
    			}
    		},
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div8);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$h.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$h($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Login', slots, []);
    	let email = '';
    	let password = '';
    	let role = 'candidate'; // Visual role selection

    	async function login() {
    		try {
    			const response = await fetch('http://127.0.0.1:3000/api/auth/login', {
    				method: 'POST',
    				headers: { 'Content-Type': 'application/json' },
    				body: JSON.stringify({ email, password })
    			});

    			const { data, message } = await response.json();

    			if (response.status === 200) {
    				// The actual role is coming from the DB, but we use the selection for UI feel
    				localStorage.setItem('token', data.token);

    				localStorage.setItem('role', data.role);
    				localStorage.setItem('name', data.name);
    				localStorage.setItem('email', data.email);
    				notify(`Welcome back, ${data.name}! Logged in as ${data.role}`, 'success');
    				replace('/dash/manage');
    			} else {
    				notify(message, 'error');
    			}
    		} catch(error) {
    			console.error('Login error:', error);
    			notify('An error occurred during login', 'error');
    		}
    	}

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console_1$5.warn(`<Login> was created with unknown prop '${key}'`);
    	});

    	const click_handler = () => $$invalidate(2, role = 'candidate');
    	const click_handler_1 = () => $$invalidate(2, role = 'recruiter');

    	function input0_input_handler() {
    		email = this.value;
    		$$invalidate(0, email);
    	}

    	function input1_input_handler() {
    		password = this.value;
    		$$invalidate(1, password);
    	}

    	$$self.$capture_state = () => ({
    		replace,
    		notify,
    		fade,
    		email,
    		password,
    		role,
    		login
    	});

    	$$self.$inject_state = $$props => {
    		if ('email' in $$props) $$invalidate(0, email = $$props.email);
    		if ('password' in $$props) $$invalidate(1, password = $$props.password);
    		if ('role' in $$props) $$invalidate(2, role = $$props.role);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		email,
    		password,
    		role,
    		login,
    		click_handler,
    		click_handler_1,
    		input0_input_handler,
    		input1_input_handler
    	];
    }

    class Login extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$h, create_fragment$h, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Login",
    			options,
    			id: create_fragment$h.name
    		});
    	}
    }

    /* src\pages\auth\Logout.svelte generated by Svelte v3.59.2 */
    const file$f = "src\\pages\\auth\\Logout.svelte";

    function create_fragment$g(ctx) {
    	let div;
    	let p;

    	const block = {
    		c: function create() {
    			div = element("div");
    			p = element("p");
    			p.textContent = "Securely logging you out...";
    			add_location(p, file$f, 13, 4, 456);
    			set_style(div, "display", "flex");
    			set_style(div, "align-items", "center");
    			set_style(div, "justify-content", "center");
    			set_style(div, "height", "100vh");
    			set_style(div, "font-family", "'Inter', sans-serif");
    			add_location(div, file$f, 12, 0, 328);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, p);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$g.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$g($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Logout', slots, []);

    	onMount(() => {
    		localStorage.clear(); // Wipe everything
    		notify("Logged out successfully", "success");
    		replace('/auth/login');
    	});

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Logout> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({ replace, onMount, notify });
    	return [];
    }

    class Logout extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$g, create_fragment$g, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Logout",
    			options,
    			id: create_fragment$g.name
    		});
    	}
    }

    /* src\pages\auth\Reset.svelte generated by Svelte v3.59.2 */

    const { console: console_1$4 } = globals;
    const file$e = "src\\pages\\auth\\Reset.svelte";

    function create_fragment$f(ctx) {
    	let h2;
    	let t1;
    	let form;
    	let input0;
    	let t2;
    	let input1;
    	let t3;
    	let input2;
    	let t4;
    	let br;
    	let t5;
    	let button;
    	let t7;
    	let div;
    	let a;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			h2 = element("h2");
    			h2.textContent = "Reset Password";
    			t1 = space();
    			form = element("form");
    			input0 = element("input");
    			t2 = space();
    			input1 = element("input");
    			t3 = space();
    			input2 = element("input");
    			t4 = space();
    			br = element("br");
    			t5 = space();
    			button = element("button");
    			button.textContent = "Reset Password";
    			t7 = space();
    			div = element("div");
    			a = element("a");
    			a.textContent = "← Go Back to Login";
    			add_location(h2, file$e, 39, 0, 1272);
    			attr_dev(input0, "type", "text");
    			attr_dev(input0, "placeholder", "Reset Token");
    			input0.required = true;
    			add_location(input0, file$e, 41, 4, 1348);
    			attr_dev(input1, "type", "password");
    			attr_dev(input1, "placeholder", "New Password");
    			input1.required = true;
    			add_location(input1, file$e, 42, 4, 1431);
    			attr_dev(input2, "type", "password");
    			attr_dev(input2, "placeholder", "Confirm Password");
    			input2.required = true;
    			add_location(input2, file$e, 43, 4, 1520);
    			add_location(br, file$e, 44, 4, 1617);
    			attr_dev(button, "type", "submit");
    			add_location(button, file$e, 45, 4, 1626);
    			add_location(form, file$e, 40, 0, 1296);
    			attr_dev(a, "href", "/#/auth/login");
    			add_location(a, file$e, 48, 4, 1710);
    			attr_dev(div, "class", "extra-links");
    			add_location(div, file$e, 47, 0, 1680);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, h2, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, form, anchor);
    			append_dev(form, input0);
    			set_input_value(input0, /*resetToken*/ ctx[0]);
    			append_dev(form, t2);
    			append_dev(form, input1);
    			set_input_value(input1, /*newPassword*/ ctx[1]);
    			append_dev(form, t3);
    			append_dev(form, input2);
    			set_input_value(input2, /*confirmPassword*/ ctx[2]);
    			append_dev(form, t4);
    			append_dev(form, br);
    			append_dev(form, t5);
    			append_dev(form, button);
    			insert_dev(target, t7, anchor);
    			insert_dev(target, div, anchor);
    			append_dev(div, a);

    			if (!mounted) {
    				dispose = [
    					listen_dev(input0, "input", /*input0_input_handler*/ ctx[4]),
    					listen_dev(input1, "input", /*input1_input_handler*/ ctx[5]),
    					listen_dev(input2, "input", /*input2_input_handler*/ ctx[6]),
    					listen_dev(form, "submit", prevent_default(/*resetPassword*/ ctx[3]), false, true, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*resetToken*/ 1 && input0.value !== /*resetToken*/ ctx[0]) {
    				set_input_value(input0, /*resetToken*/ ctx[0]);
    			}

    			if (dirty & /*newPassword*/ 2 && input1.value !== /*newPassword*/ ctx[1]) {
    				set_input_value(input1, /*newPassword*/ ctx[1]);
    			}

    			if (dirty & /*confirmPassword*/ 4 && input2.value !== /*confirmPassword*/ ctx[2]) {
    				set_input_value(input2, /*confirmPassword*/ ctx[2]);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(h2);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(form);
    			if (detaching) detach_dev(t7);
    			if (detaching) detach_dev(div);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$f.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$f($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Reset', slots, []);
    	let resetToken = '';
    	let newPassword = '';
    	let confirmPassword = '';

    	async function resetPassword() {
    		if (!resetToken || !newPassword || !confirmPassword) {
    			notify('All fields are required.', 'info');
    			return;
    		}

    		if (newPassword !== confirmPassword) {
    			notify("Passwords don't match.", 'error');
    			return;
    		}

    		try {
    			const res = await fetch('http://127.0.0.1:3000/api/auth/reset', {
    				method: 'POST',
    				headers: { 'Content-Type': 'application/json' },
    				body: JSON.stringify({
    					reset_token: resetToken,
    					new_password: newPassword
    				})
    			});

    			const { message, success } = await res.json();

    			if (success) {
    				notify(message, 'success');
    				replace('/auth/login');
    			} else {
    				notify(message, 'error');
    			}
    		} catch(error) {
    			console.error('Reset error:', error);
    			notify('An error occurred. Please try again.', 'error');
    		}
    	}

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console_1$4.warn(`<Reset> was created with unknown prop '${key}'`);
    	});

    	function input0_input_handler() {
    		resetToken = this.value;
    		$$invalidate(0, resetToken);
    	}

    	function input1_input_handler() {
    		newPassword = this.value;
    		$$invalidate(1, newPassword);
    	}

    	function input2_input_handler() {
    		confirmPassword = this.value;
    		$$invalidate(2, confirmPassword);
    	}

    	$$self.$capture_state = () => ({
    		replace,
    		notify,
    		resetToken,
    		newPassword,
    		confirmPassword,
    		resetPassword
    	});

    	$$self.$inject_state = $$props => {
    		if ('resetToken' in $$props) $$invalidate(0, resetToken = $$props.resetToken);
    		if ('newPassword' in $$props) $$invalidate(1, newPassword = $$props.newPassword);
    		if ('confirmPassword' in $$props) $$invalidate(2, confirmPassword = $$props.confirmPassword);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		resetToken,
    		newPassword,
    		confirmPassword,
    		resetPassword,
    		input0_input_handler,
    		input1_input_handler,
    		input2_input_handler
    	];
    }

    class Reset extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$f, create_fragment$f, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Reset",
    			options,
    			id: create_fragment$f.name
    		});
    	}
    }

    /* src\pages\auth\Signup.svelte generated by Svelte v3.59.2 */

    const { console: console_1$3 } = globals;
    const file$d = "src\\pages\\auth\\Signup.svelte";

    function create_fragment$e(ctx) {
    	let div10;
    	let div9;
    	let div7;
    	let div0;
    	let h2;
    	let t1;
    	let p0;
    	let t3;
    	let div1;
    	let button0;
    	let t5;
    	let button1;
    	let t7;
    	let form;
    	let div2;
    	let label0;
    	let t9;
    	let input0;
    	let t10;
    	let div3;
    	let label1;
    	let t12;
    	let input1;
    	let t13;
    	let div4;
    	let label2;
    	let t15;
    	let input2;
    	let t16;
    	let div5;
    	let label3;
    	let t18;
    	let input3;
    	let t19;
    	let button2;
    	let t21;
    	let div6;
    	let p1;
    	let t22;
    	let a;
    	let t24;
    	let div8;
    	let img;
    	let img_src_value;
    	let t25;
    	let h3;
    	let t27;
    	let p2;
    	let div10_intro;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div10 = element("div");
    			div9 = element("div");
    			div7 = element("div");
    			div0 = element("div");
    			h2 = element("h2");
    			h2.textContent = "Create Account";
    			t1 = space();
    			p0 = element("p");
    			p0.textContent = "Join the future of AI-powered recruitment";
    			t3 = space();
    			div1 = element("div");
    			button0 = element("button");
    			button0.textContent = "👤 Candidate";
    			t5 = space();
    			button1 = element("button");
    			button1.textContent = "🏢 Recruiter";
    			t7 = space();
    			form = element("form");
    			div2 = element("div");
    			label0 = element("label");
    			label0.textContent = "Full Name";
    			t9 = space();
    			input0 = element("input");
    			t10 = space();
    			div3 = element("div");
    			label1 = element("label");
    			label1.textContent = "Email Address";
    			t12 = space();
    			input1 = element("input");
    			t13 = space();
    			div4 = element("div");
    			label2 = element("label");
    			label2.textContent = "Password";
    			t15 = space();
    			input2 = element("input");
    			t16 = space();
    			div5 = element("div");
    			label3 = element("label");
    			label3.textContent = "Confirm Password";
    			t18 = space();
    			input3 = element("input");
    			t19 = space();
    			button2 = element("button");
    			button2.textContent = "Get Started";
    			t21 = space();
    			div6 = element("div");
    			p1 = element("p");
    			t22 = text("Already have an account? ");
    			a = element("a");
    			a.textContent = "Sign In";
    			t24 = space();
    			div8 = element("div");
    			img = element("img");
    			t25 = space();
    			h3 = element("h3");
    			h3.textContent = "Start Your Journey";
    			t27 = space();
    			p2 = element("p");
    			p2.textContent = "Whether you're hiring or seeking, our AI ensures the perfect match every single time.";
    			add_location(h2, file$d, 48, 16, 1490);
    			add_location(p0, file$d, 49, 16, 1530);
    			attr_dev(div0, "class", "auth-header");
    			add_location(div0, file$d, 47, 12, 1448);
    			attr_dev(button0, "class", "role-btn");
    			toggle_class(button0, "active", /*role*/ ctx[4] === 'candidate');
    			add_location(button0, file$d, 53, 16, 1653);
    			attr_dev(button1, "class", "role-btn");
    			toggle_class(button1, "active", /*role*/ ctx[4] === 'recruiter');
    			add_location(button1, file$d, 60, 16, 1906);
    			attr_dev(div1, "class", "role-toggle");
    			add_location(div1, file$d, 52, 12, 1611);
    			add_location(label0, file$d, 71, 20, 2263);
    			attr_dev(input0, "type", "text");
    			attr_dev(input0, "placeholder", "e.g. Bilal Tariq");
    			input0.required = true;
    			add_location(input0, file$d, 72, 20, 2308);
    			attr_dev(div2, "class", "input-group");
    			add_location(div2, file$d, 70, 16, 2217);
    			add_location(label1, file$d, 76, 20, 2488);
    			attr_dev(input1, "type", "email");
    			attr_dev(input1, "placeholder", "email@example.com");
    			input1.required = true;
    			add_location(input1, file$d, 77, 20, 2537);
    			attr_dev(div3, "class", "input-group");
    			add_location(div3, file$d, 75, 16, 2442);
    			add_location(label2, file$d, 81, 20, 2704);
    			attr_dev(input2, "type", "password");
    			attr_dev(input2, "placeholder", "Create a strong password");
    			input2.required = true;
    			add_location(input2, file$d, 82, 20, 2748);
    			attr_dev(div4, "class", "input-group");
    			add_location(div4, file$d, 80, 16, 2658);
    			add_location(label3, file$d, 86, 20, 2928);
    			attr_dev(input3, "type", "password");
    			attr_dev(input3, "placeholder", "Repeat password");
    			input3.required = true;
    			add_location(input3, file$d, 87, 20, 2980);
    			attr_dev(div5, "class", "input-group");
    			add_location(div5, file$d, 85, 16, 2882);
    			attr_dev(button2, "type", "submit");
    			attr_dev(button2, "class", "submit-btn");
    			add_location(button2, file$d, 90, 16, 3112);
    			add_location(form, file$d, 69, 12, 2175);
    			attr_dev(a, "href", "/#/auth/login");
    			add_location(a, file$d, 94, 44, 3277);
    			add_location(p1, file$d, 94, 16, 3249);
    			attr_dev(div6, "class", "extra-links");
    			add_location(div6, file$d, 93, 12, 3207);
    			attr_dev(div7, "class", "auth-form-section");
    			add_location(div7, file$d, 46, 8, 1404);
    			if (!src_url_equal(img.src, img_src_value = "imgs/front.png")) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", "Signup Illustration");
    			add_location(img, file$d, 99, 12, 3405);
    			add_location(h3, file$d, 100, 12, 3470);
    			set_style(p2, "opacity", "0.8");
    			set_style(p2, "margin-top", "10px");
    			set_style(p2, "font-size", "14px");
    			add_location(p2, file$d, 101, 12, 3510);
    			attr_dev(div8, "class", "auth-image-section");
    			add_location(div8, file$d, 98, 8, 3360);
    			attr_dev(div9, "class", "auth-container");
    			add_location(div9, file$d, 45, 4, 1367);
    			attr_dev(div10, "class", "auth-wrapper");
    			add_location(div10, file$d, 44, 0, 1328);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div10, anchor);
    			append_dev(div10, div9);
    			append_dev(div9, div7);
    			append_dev(div7, div0);
    			append_dev(div0, h2);
    			append_dev(div0, t1);
    			append_dev(div0, p0);
    			append_dev(div7, t3);
    			append_dev(div7, div1);
    			append_dev(div1, button0);
    			append_dev(div1, t5);
    			append_dev(div1, button1);
    			append_dev(div7, t7);
    			append_dev(div7, form);
    			append_dev(form, div2);
    			append_dev(div2, label0);
    			append_dev(div2, t9);
    			append_dev(div2, input0);
    			set_input_value(input0, /*name*/ ctx[0]);
    			append_dev(form, t10);
    			append_dev(form, div3);
    			append_dev(div3, label1);
    			append_dev(div3, t12);
    			append_dev(div3, input1);
    			set_input_value(input1, /*email*/ ctx[1]);
    			append_dev(form, t13);
    			append_dev(form, div4);
    			append_dev(div4, label2);
    			append_dev(div4, t15);
    			append_dev(div4, input2);
    			set_input_value(input2, /*password*/ ctx[2]);
    			append_dev(form, t16);
    			append_dev(form, div5);
    			append_dev(div5, label3);
    			append_dev(div5, t18);
    			append_dev(div5, input3);
    			set_input_value(input3, /*confirmPassword*/ ctx[3]);
    			append_dev(form, t19);
    			append_dev(form, button2);
    			append_dev(div7, t21);
    			append_dev(div7, div6);
    			append_dev(div6, p1);
    			append_dev(p1, t22);
    			append_dev(p1, a);
    			append_dev(div9, t24);
    			append_dev(div9, div8);
    			append_dev(div8, img);
    			append_dev(div8, t25);
    			append_dev(div8, h3);
    			append_dev(div8, t27);
    			append_dev(div8, p2);

    			if (!mounted) {
    				dispose = [
    					listen_dev(button0, "click", /*click_handler*/ ctx[6], false, false, false, false),
    					listen_dev(button1, "click", /*click_handler_1*/ ctx[7], false, false, false, false),
    					listen_dev(input0, "input", /*input0_input_handler*/ ctx[8]),
    					listen_dev(input1, "input", /*input1_input_handler*/ ctx[9]),
    					listen_dev(input2, "input", /*input2_input_handler*/ ctx[10]),
    					listen_dev(input3, "input", /*input3_input_handler*/ ctx[11]),
    					listen_dev(form, "submit", /*signup*/ ctx[5], false, false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*role*/ 16) {
    				toggle_class(button0, "active", /*role*/ ctx[4] === 'candidate');
    			}

    			if (dirty & /*role*/ 16) {
    				toggle_class(button1, "active", /*role*/ ctx[4] === 'recruiter');
    			}

    			if (dirty & /*name*/ 1 && input0.value !== /*name*/ ctx[0]) {
    				set_input_value(input0, /*name*/ ctx[0]);
    			}

    			if (dirty & /*email*/ 2 && input1.value !== /*email*/ ctx[1]) {
    				set_input_value(input1, /*email*/ ctx[1]);
    			}

    			if (dirty & /*password*/ 4 && input2.value !== /*password*/ ctx[2]) {
    				set_input_value(input2, /*password*/ ctx[2]);
    			}

    			if (dirty & /*confirmPassword*/ 8 && input3.value !== /*confirmPassword*/ ctx[3]) {
    				set_input_value(input3, /*confirmPassword*/ ctx[3]);
    			}
    		},
    		i: function intro(local) {
    			if (!div10_intro) {
    				add_render_callback(() => {
    					div10_intro = create_in_transition(div10, fade, {});
    					div10_intro.start();
    				});
    			}
    		},
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div10);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$e.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$e($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Signup', slots, []);
    	let name = '';
    	let email = '';
    	let password = '';
    	let confirmPassword = '';
    	let role = 'candidate';

    	async function signup(event) {
    		event.preventDefault();

    		if (password !== confirmPassword) {
    			notify("Passwords don't match!", "error");
    			return;
    		}

    		try {
    			const response = await fetch('http://127.0.0.1:3000/api/auth/signup', {
    				method: 'POST',
    				headers: { 'Content-Type': 'application/json' },
    				body: JSON.stringify({ name, email, password, role })
    			});

    			const { message } = await response.json();

    			if (response.status === 201) {
    				notify(`Success! Registered as ${role.toUpperCase()}`, 'success');
    				replace('/auth/login');
    			} else {
    				notify(message, 'error');
    			}
    		} catch(error) {
    			console.error('Signup error:', error);
    			notify('An error occurred during signup', 'error');
    		}
    	}

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console_1$3.warn(`<Signup> was created with unknown prop '${key}'`);
    	});

    	const click_handler = () => $$invalidate(4, role = 'candidate');
    	const click_handler_1 = () => $$invalidate(4, role = 'recruiter');

    	function input0_input_handler() {
    		name = this.value;
    		$$invalidate(0, name);
    	}

    	function input1_input_handler() {
    		email = this.value;
    		$$invalidate(1, email);
    	}

    	function input2_input_handler() {
    		password = this.value;
    		$$invalidate(2, password);
    	}

    	function input3_input_handler() {
    		confirmPassword = this.value;
    		$$invalidate(3, confirmPassword);
    	}

    	$$self.$capture_state = () => ({
    		replace,
    		notify,
    		fade,
    		name,
    		email,
    		password,
    		confirmPassword,
    		role,
    		signup
    	});

    	$$self.$inject_state = $$props => {
    		if ('name' in $$props) $$invalidate(0, name = $$props.name);
    		if ('email' in $$props) $$invalidate(1, email = $$props.email);
    		if ('password' in $$props) $$invalidate(2, password = $$props.password);
    		if ('confirmPassword' in $$props) $$invalidate(3, confirmPassword = $$props.confirmPassword);
    		if ('role' in $$props) $$invalidate(4, role = $$props.role);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		name,
    		email,
    		password,
    		confirmPassword,
    		role,
    		signup,
    		click_handler,
    		click_handler_1,
    		input0_input_handler,
    		input1_input_handler,
    		input2_input_handler,
    		input3_input_handler
    	];
    }

    class Signup extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$e, create_fragment$e, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Signup",
    			options,
    			id: create_fragment$e.name
    		});
    	}
    }

    /* src\pages\auth\AuthParent.svelte generated by Svelte v3.59.2 */
    const file$c = "src\\pages\\auth\\AuthParent.svelte";

    function create_fragment$d(ctx) {
    	let div;
    	let router;
    	let current;

    	router = new Router({
    			props: { routes: /*routes*/ ctx[0] },
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			div = element("div");
    			create_component(router.$$.fragment);
    			attr_dev(div, "class", "auth-root svelte-11s0gqa");
    			add_location(div, file$c, 18, 0, 410);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			mount_component(router, div, null);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(router.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(router.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_component(router);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$d.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$d($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('AuthParent', slots, []);

    	const routes = {
    		'/auth/forgot': Forgot,
    		'/auth/login': Login,
    		'/auth/logout': Logout,
    		'/auth/reset': Reset,
    		'/auth/signup': Signup
    	};

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<AuthParent> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({
    		Router,
    		Forgot,
    		Login,
    		Logout,
    		Reset,
    		Signup,
    		routes
    	});

    	return [routes];
    }

    class AuthParent extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$d, create_fragment$d, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "AuthParent",
    			options,
    			id: create_fragment$d.name
    		});
    	}
    }

    /* src\components\ThemeToggle.svelte generated by Svelte v3.59.2 */
    const file$b = "src\\components\\ThemeToggle.svelte";

    // (28:4) {:else}
    function create_else_block$5(ctx) {
    	let span;

    	const block = {
    		c: function create() {
    			span = element("span");
    			span.textContent = "🌙";
    			attr_dev(span, "class", "icon svelte-15mo5l8");
    			add_location(span, file$b, 28, 8, 720);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(span);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block$5.name,
    		type: "else",
    		source: "(28:4) {:else}",
    		ctx
    	});

    	return block;
    }

    // (26:4) {#if isDark}
    function create_if_block$7(ctx) {
    	let span;

    	const block = {
    		c: function create() {
    			span = element("span");
    			span.textContent = "☀️";
    			attr_dev(span, "class", "icon svelte-15mo5l8");
    			add_location(span, file$b, 26, 8, 671);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(span);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$7.name,
    		type: "if",
    		source: "(26:4) {#if isDark}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$c(ctx) {
    	let button;
    	let mounted;
    	let dispose;

    	function select_block_type(ctx, dirty) {
    		if (/*isDark*/ ctx[0]) return create_if_block$7;
    		return create_else_block$5;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block = current_block_type(ctx);

    	const block = {
    		c: function create() {
    			button = element("button");
    			if_block.c();
    			attr_dev(button, "class", "theme-toggle svelte-15mo5l8");
    			attr_dev(button, "aria-label", "Toggle theme");
    			add_location(button, file$b, 24, 0, 567);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button, anchor);
    			if_block.m(button, null);

    			if (!mounted) {
    				dispose = listen_dev(button, "click", /*toggleTheme*/ ctx[1], false, false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (current_block_type !== (current_block_type = select_block_type(ctx))) {
    				if_block.d(1);
    				if_block = current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					if_block.m(button, null);
    				}
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button);
    			if_block.d();
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$c.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$c($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('ThemeToggle', slots, []);
    	let isDark = false;

    	onMount(() => {
    		$$invalidate(0, isDark = localStorage.getItem('theme') === 'dark');

    		if (isDark) {
    			document.body.classList.add('dark');
    		}
    	});

    	function toggleTheme() {
    		$$invalidate(0, isDark = !isDark);

    		if (isDark) {
    			document.body.classList.add('dark');
    			localStorage.setItem('theme', 'dark');
    		} else {
    			document.body.classList.remove('dark');
    			localStorage.setItem('theme', 'light');
    		}
    	}

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<ThemeToggle> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({ onMount, isDark, toggleTheme });

    	$$self.$inject_state = $$props => {
    		if ('isDark' in $$props) $$invalidate(0, isDark = $$props.isDark);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [isDark, toggleTheme];
    }

    class ThemeToggle extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$c, create_fragment$c, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "ThemeToggle",
    			options,
    			id: create_fragment$c.name
    		});
    	}
    }

    /* src\pages\dash\Change.svelte generated by Svelte v3.59.2 */
    const file$a = "src\\pages\\dash\\Change.svelte";

    function create_fragment$b(ctx) {
    	let div21;
    	let div20;
    	let div5;
    	let h30;
    	let t1;
    	let p0;
    	let t3;
    	let div2;
    	let div0;
    	let t4_value = /*profile*/ ctx[0].name[0] + "";
    	let t4;
    	let t5;
    	let div1;
    	let h4;
    	let t6_value = /*profile*/ ctx[0].name + "";
    	let t6;
    	let t7;
    	let p1;
    	let t8_value = /*profile*/ ctx[0].email + "";
    	let t8;
    	let t9;
    	let div3;
    	let label0;
    	let t11;
    	let input0;
    	let t12;
    	let div4;
    	let label1;
    	let t14;
    	let input1;
    	let t15;
    	let button0;
    	let t17;
    	let div9;
    	let h31;
    	let t19;
    	let p2;
    	let t21;
    	let div6;
    	let label2;
    	let t23;
    	let input2;
    	let t24;
    	let div7;
    	let label3;
    	let t26;
    	let input3;
    	let t27;
    	let div8;
    	let label4;
    	let t29;
    	let input4;
    	let t30;
    	let button1;
    	let t32;
    	let div17;
    	let h32;
    	let t34;
    	let p3;
    	let t36;
    	let div16;
    	let div11;
    	let div10;
    	let p4;
    	let t38;
    	let p5;
    	let t40;
    	let label5;
    	let input5;
    	let t41;
    	let span0;
    	let t42;
    	let div13;
    	let div12;
    	let p6;
    	let t44;
    	let p7;
    	let t46;
    	let label6;
    	let input6;
    	let t47;
    	let span1;
    	let t48;
    	let div15;
    	let div14;
    	let p8;
    	let t50;
    	let p9;
    	let t52;
    	let label7;
    	let input7;
    	let input7_checked_value;
    	let t53;
    	let span2;
    	let t54;
    	let div19;
    	let h33;
    	let t56;
    	let p10;
    	let t58;
    	let div18;
    	let button2;
    	let t60;
    	let button3;
    	let div21_intro;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div21 = element("div");
    			div20 = element("div");
    			div5 = element("div");
    			h30 = element("h3");
    			h30.textContent = "👤 Profile Settings";
    			t1 = space();
    			p0 = element("p");
    			p0.textContent = "Manage your public identity and contact details.";
    			t3 = space();
    			div2 = element("div");
    			div0 = element("div");
    			t4 = text(t4_value);
    			t5 = space();
    			div1 = element("div");
    			h4 = element("h4");
    			t6 = text(t6_value);
    			t7 = space();
    			p1 = element("p");
    			t8 = text(t8_value);
    			t9 = space();
    			div3 = element("div");
    			label0 = element("label");
    			label0.textContent = "Full Name";
    			t11 = space();
    			input0 = element("input");
    			t12 = space();
    			div4 = element("div");
    			label1 = element("label");
    			label1.textContent = "Email Address";
    			t14 = space();
    			input1 = element("input");
    			t15 = space();
    			button0 = element("button");
    			button0.textContent = "Save Changes";
    			t17 = space();
    			div9 = element("div");
    			h31 = element("h3");
    			h31.textContent = "🔒 Security";
    			t19 = space();
    			p2 = element("p");
    			p2.textContent = "Update your password and secure your account.";
    			t21 = space();
    			div6 = element("div");
    			label2 = element("label");
    			label2.textContent = "Current Password";
    			t23 = space();
    			input2 = element("input");
    			t24 = space();
    			div7 = element("div");
    			label3 = element("label");
    			label3.textContent = "New Password";
    			t26 = space();
    			input3 = element("input");
    			t27 = space();
    			div8 = element("div");
    			label4 = element("label");
    			label4.textContent = "Confirm Password";
    			t29 = space();
    			input4 = element("input");
    			t30 = space();
    			button1 = element("button");
    			button1.textContent = "Update Password";
    			t32 = space();
    			div17 = element("div");
    			h32 = element("h3");
    			h32.textContent = "⚙️ Preferences";
    			t34 = space();
    			p3 = element("p");
    			p3.textContent = "Customize your dashboard experience.";
    			t36 = space();
    			div16 = element("div");
    			div11 = element("div");
    			div10 = element("div");
    			p4 = element("p");
    			p4.textContent = "Email Notifications";
    			t38 = space();
    			p5 = element("p");
    			p5.textContent = "Get weekly summaries of your matches.";
    			t40 = space();
    			label5 = element("label");
    			input5 = element("input");
    			t41 = space();
    			span0 = element("span");
    			t42 = space();
    			div13 = element("div");
    			div12 = element("div");
    			p6 = element("p");
    			p6.textContent = "AI Analysis Alerts";
    			t44 = space();
    			p7 = element("p");
    			p7.textContent = "Notify when a high-match candidate is found.";
    			t46 = space();
    			label6 = element("label");
    			input6 = element("input");
    			t47 = space();
    			span1 = element("span");
    			t48 = space();
    			div15 = element("div");
    			div14 = element("div");
    			p8 = element("p");
    			p8.textContent = "Dark Interface";
    			t50 = space();
    			p9 = element("p");
    			p9.textContent = "Easier on your eyes in low light.";
    			t52 = space();
    			label7 = element("label");
    			input7 = element("input");
    			t53 = space();
    			span2 = element("span");
    			t54 = space();
    			div19 = element("div");
    			h33 = element("h3");
    			h33.textContent = "⚠️ Danger Zone";
    			t56 = space();
    			p10 = element("p");
    			p10.textContent = "Irreversible account actions.";
    			t58 = space();
    			div18 = element("div");
    			button2 = element("button");
    			button2.textContent = "Logout from session";
    			t60 = space();
    			button3 = element("button");
    			button3.textContent = "Delete My Account";
    			attr_dev(h30, "class", "svelte-1dofv9r");
    			add_location(h30, file$a, 47, 12, 1344);
    			attr_dev(p0, "class", "section-desc svelte-1dofv9r");
    			add_location(p0, file$a, 48, 12, 1385);
    			attr_dev(div0, "class", "p-avatar svelte-1dofv9r");
    			add_location(div0, file$a, 51, 16, 1533);
    			attr_dev(h4, "class", "svelte-1dofv9r");
    			add_location(h4, file$a, 53, 20, 1621);
    			attr_dev(p1, "class", "svelte-1dofv9r");
    			add_location(p1, file$a, 54, 20, 1665);
    			add_location(div1, file$a, 52, 16, 1595);
    			attr_dev(div2, "class", "profile-preview svelte-1dofv9r");
    			add_location(div2, file$a, 50, 12, 1487);
    			attr_dev(label0, "class", "svelte-1dofv9r");
    			add_location(label0, file$a, 59, 16, 1784);
    			attr_dev(input0, "type", "text");
    			attr_dev(input0, "placeholder", "Your Name");
    			attr_dev(input0, "class", "svelte-1dofv9r");
    			add_location(input0, file$a, 60, 16, 1825);
    			attr_dev(div3, "class", "form-group svelte-1dofv9r");
    			add_location(div3, file$a, 58, 12, 1743);
    			attr_dev(label1, "class", "svelte-1dofv9r");
    			add_location(label1, file$a, 63, 16, 1969);
    			attr_dev(input1, "type", "email");
    			attr_dev(input1, "placeholder", "Email");
    			attr_dev(input1, "class", "svelte-1dofv9r");
    			add_location(input1, file$a, 64, 16, 2014);
    			attr_dev(div4, "class", "form-group svelte-1dofv9r");
    			add_location(div4, file$a, 62, 12, 1928);
    			attr_dev(button0, "class", "primary-btn svelte-1dofv9r");
    			add_location(button0, file$a, 66, 12, 2115);
    			attr_dev(div5, "class", "settings-card glass svelte-1dofv9r");
    			add_location(div5, file$a, 46, 8, 1298);
    			attr_dev(h31, "class", "svelte-1dofv9r");
    			add_location(h31, file$a, 71, 12, 2292);
    			attr_dev(p2, "class", "section-desc svelte-1dofv9r");
    			add_location(p2, file$a, 72, 12, 2325);
    			attr_dev(label2, "class", "svelte-1dofv9r");
    			add_location(label2, file$a, 75, 16, 2453);
    			attr_dev(input2, "type", "password");
    			attr_dev(input2, "placeholder", "••••••••");
    			attr_dev(input2, "class", "svelte-1dofv9r");
    			add_location(input2, file$a, 76, 16, 2501);
    			attr_dev(div6, "class", "form-group svelte-1dofv9r");
    			add_location(div6, file$a, 74, 12, 2412);
    			attr_dev(label3, "class", "svelte-1dofv9r");
    			add_location(label3, file$a, 79, 16, 2656);
    			attr_dev(input3, "type", "password");
    			attr_dev(input3, "placeholder", "New Password");
    			attr_dev(input3, "class", "svelte-1dofv9r");
    			add_location(input3, file$a, 80, 16, 2700);
    			attr_dev(div7, "class", "form-group svelte-1dofv9r");
    			add_location(div7, file$a, 78, 12, 2615);
    			attr_dev(label4, "class", "svelte-1dofv9r");
    			add_location(label4, file$a, 83, 16, 2855);
    			attr_dev(input4, "type", "password");
    			attr_dev(input4, "placeholder", "Confirm New Password");
    			attr_dev(input4, "class", "svelte-1dofv9r");
    			add_location(input4, file$a, 84, 16, 2903);
    			attr_dev(div8, "class", "form-group svelte-1dofv9r");
    			add_location(div8, file$a, 82, 12, 2814);
    			attr_dev(button1, "class", "secondary-btn svelte-1dofv9r");
    			add_location(button1, file$a, 86, 12, 3029);
    			attr_dev(div9, "class", "settings-card glass svelte-1dofv9r");
    			add_location(div9, file$a, 70, 8, 2246);
    			attr_dev(h32, "class", "svelte-1dofv9r");
    			add_location(h32, file$a, 91, 12, 3217);
    			attr_dev(p3, "class", "section-desc svelte-1dofv9r");
    			add_location(p3, file$a, 92, 12, 3253);
    			attr_dev(p4, "class", "t-label svelte-1dofv9r");
    			add_location(p4, file$a, 97, 24, 3450);
    			attr_dev(p5, "class", "t-desc svelte-1dofv9r");
    			add_location(p5, file$a, 98, 24, 3517);
    			add_location(div10, file$a, 96, 20, 3420);
    			attr_dev(input5, "type", "checkbox");
    			attr_dev(input5, "class", "svelte-1dofv9r");
    			add_location(input5, file$a, 101, 24, 3671);
    			attr_dev(span0, "class", "slider svelte-1dofv9r");
    			add_location(span0, file$a, 102, 24, 3765);
    			attr_dev(label5, "class", "switch svelte-1dofv9r");
    			add_location(label5, file$a, 100, 20, 3624);
    			attr_dev(div11, "class", "toggle-item svelte-1dofv9r");
    			add_location(div11, file$a, 95, 16, 3374);
    			attr_dev(p6, "class", "t-label svelte-1dofv9r");
    			add_location(p6, file$a, 108, 24, 3939);
    			attr_dev(p7, "class", "t-desc svelte-1dofv9r");
    			add_location(p7, file$a, 109, 24, 4005);
    			add_location(div12, file$a, 107, 20, 3909);
    			attr_dev(input6, "type", "checkbox");
    			attr_dev(input6, "class", "svelte-1dofv9r");
    			add_location(input6, file$a, 112, 24, 4166);
    			attr_dev(span1, "class", "slider svelte-1dofv9r");
    			add_location(span1, file$a, 113, 24, 4258);
    			attr_dev(label6, "class", "switch svelte-1dofv9r");
    			add_location(label6, file$a, 111, 20, 4119);
    			attr_dev(div13, "class", "toggle-item svelte-1dofv9r");
    			add_location(div13, file$a, 106, 16, 3863);
    			attr_dev(p8, "class", "t-label svelte-1dofv9r");
    			add_location(p8, file$a, 119, 24, 4432);
    			attr_dev(p9, "class", "t-desc svelte-1dofv9r");
    			add_location(p9, file$a, 120, 24, 4494);
    			add_location(div14, file$a, 118, 20, 4402);
    			attr_dev(input7, "type", "checkbox");
    			input7.checked = input7_checked_value = /*preferences*/ ctx[2].darkMode;
    			attr_dev(input7, "class", "svelte-1dofv9r");
    			add_location(input7, file$a, 123, 24, 4644);
    			attr_dev(span2, "class", "slider svelte-1dofv9r");
    			add_location(span2, file$a, 124, 24, 4750);
    			attr_dev(label7, "class", "switch svelte-1dofv9r");
    			add_location(label7, file$a, 122, 20, 4597);
    			attr_dev(div15, "class", "toggle-item svelte-1dofv9r");
    			add_location(div15, file$a, 117, 16, 4356);
    			attr_dev(div16, "class", "toggle-group svelte-1dofv9r");
    			add_location(div16, file$a, 94, 12, 3331);
    			attr_dev(div17, "class", "settings-card glass svelte-1dofv9r");
    			add_location(div17, file$a, 90, 8, 3171);
    			attr_dev(h33, "class", "svelte-1dofv9r");
    			add_location(h33, file$a, 132, 12, 4956);
    			attr_dev(p10, "class", "section-desc svelte-1dofv9r");
    			add_location(p10, file$a, 133, 12, 4992);
    			attr_dev(button2, "class", "outline-btn svelte-1dofv9r");
    			add_location(button2, file$a, 135, 16, 5107);
    			attr_dev(button3, "class", "delete-btn svelte-1dofv9r");
    			add_location(button3, file$a, 136, 16, 5234);
    			attr_dev(div18, "class", "danger-actions svelte-1dofv9r");
    			add_location(div18, file$a, 134, 12, 5062);
    			attr_dev(div19, "class", "settings-card glass danger svelte-1dofv9r");
    			add_location(div19, file$a, 131, 8, 4903);
    			attr_dev(div20, "class", "settings-grid svelte-1dofv9r");
    			add_location(div20, file$a, 44, 4, 1229);
    			attr_dev(div21, "class", "settings-page svelte-1dofv9r");
    			add_location(div21, file$a, 43, 0, 1189);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div21, anchor);
    			append_dev(div21, div20);
    			append_dev(div20, div5);
    			append_dev(div5, h30);
    			append_dev(div5, t1);
    			append_dev(div5, p0);
    			append_dev(div5, t3);
    			append_dev(div5, div2);
    			append_dev(div2, div0);
    			append_dev(div0, t4);
    			append_dev(div2, t5);
    			append_dev(div2, div1);
    			append_dev(div1, h4);
    			append_dev(h4, t6);
    			append_dev(div1, t7);
    			append_dev(div1, p1);
    			append_dev(p1, t8);
    			append_dev(div5, t9);
    			append_dev(div5, div3);
    			append_dev(div3, label0);
    			append_dev(div3, t11);
    			append_dev(div3, input0);
    			set_input_value(input0, /*profile*/ ctx[0].name);
    			append_dev(div5, t12);
    			append_dev(div5, div4);
    			append_dev(div4, label1);
    			append_dev(div4, t14);
    			append_dev(div4, input1);
    			set_input_value(input1, /*profile*/ ctx[0].email);
    			append_dev(div5, t15);
    			append_dev(div5, button0);
    			append_dev(div20, t17);
    			append_dev(div20, div9);
    			append_dev(div9, h31);
    			append_dev(div9, t19);
    			append_dev(div9, p2);
    			append_dev(div9, t21);
    			append_dev(div9, div6);
    			append_dev(div6, label2);
    			append_dev(div6, t23);
    			append_dev(div6, input2);
    			set_input_value(input2, /*passwordData*/ ctx[1].current);
    			append_dev(div9, t24);
    			append_dev(div9, div7);
    			append_dev(div7, label3);
    			append_dev(div7, t26);
    			append_dev(div7, input3);
    			set_input_value(input3, /*passwordData*/ ctx[1].new);
    			append_dev(div9, t27);
    			append_dev(div9, div8);
    			append_dev(div8, label4);
    			append_dev(div8, t29);
    			append_dev(div8, input4);
    			set_input_value(input4, /*passwordData*/ ctx[1].confirm);
    			append_dev(div9, t30);
    			append_dev(div9, button1);
    			append_dev(div20, t32);
    			append_dev(div20, div17);
    			append_dev(div17, h32);
    			append_dev(div17, t34);
    			append_dev(div17, p3);
    			append_dev(div17, t36);
    			append_dev(div17, div16);
    			append_dev(div16, div11);
    			append_dev(div11, div10);
    			append_dev(div10, p4);
    			append_dev(div10, t38);
    			append_dev(div10, p5);
    			append_dev(div11, t40);
    			append_dev(div11, label5);
    			append_dev(label5, input5);
    			input5.checked = /*preferences*/ ctx[2].emailNotifications;
    			append_dev(label5, t41);
    			append_dev(label5, span0);
    			append_dev(div16, t42);
    			append_dev(div16, div13);
    			append_dev(div13, div12);
    			append_dev(div12, p6);
    			append_dev(div12, t44);
    			append_dev(div12, p7);
    			append_dev(div13, t46);
    			append_dev(div13, label6);
    			append_dev(label6, input6);
    			input6.checked = /*preferences*/ ctx[2].aiAnalysisAlerts;
    			append_dev(label6, t47);
    			append_dev(label6, span1);
    			append_dev(div16, t48);
    			append_dev(div16, div15);
    			append_dev(div15, div14);
    			append_dev(div14, p8);
    			append_dev(div14, t50);
    			append_dev(div14, p9);
    			append_dev(div15, t52);
    			append_dev(div15, label7);
    			append_dev(label7, input7);
    			append_dev(label7, t53);
    			append_dev(label7, span2);
    			append_dev(div20, t54);
    			append_dev(div20, div19);
    			append_dev(div19, h33);
    			append_dev(div19, t56);
    			append_dev(div19, p10);
    			append_dev(div19, t58);
    			append_dev(div19, div18);
    			append_dev(div18, button2);
    			append_dev(div18, t60);
    			append_dev(div18, button3);

    			if (!mounted) {
    				dispose = [
    					listen_dev(input0, "input", /*input0_input_handler*/ ctx[6]),
    					listen_dev(input1, "input", /*input1_input_handler*/ ctx[7]),
    					listen_dev(button0, "click", /*saveProfile*/ ctx[3], false, false, false, false),
    					listen_dev(input2, "input", /*input2_input_handler*/ ctx[8]),
    					listen_dev(input3, "input", /*input3_input_handler*/ ctx[9]),
    					listen_dev(input4, "input", /*input4_input_handler*/ ctx[10]),
    					listen_dev(button1, "click", /*changePassword*/ ctx[4], false, false, false, false),
    					listen_dev(input5, "change", /*input5_change_handler*/ ctx[11]),
    					listen_dev(input6, "change", /*input6_change_handler*/ ctx[12]),
    					listen_dev(input7, "change", /*toggleDarkMode*/ ctx[5], false, false, false, false),
    					listen_dev(button2, "click", /*click_handler*/ ctx[13], false, false, false, false),
    					listen_dev(button3, "click", /*click_handler_1*/ ctx[14], false, false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*profile*/ 1 && t4_value !== (t4_value = /*profile*/ ctx[0].name[0] + "")) set_data_dev(t4, t4_value);
    			if (dirty & /*profile*/ 1 && t6_value !== (t6_value = /*profile*/ ctx[0].name + "")) set_data_dev(t6, t6_value);
    			if (dirty & /*profile*/ 1 && t8_value !== (t8_value = /*profile*/ ctx[0].email + "")) set_data_dev(t8, t8_value);

    			if (dirty & /*profile*/ 1 && input0.value !== /*profile*/ ctx[0].name) {
    				set_input_value(input0, /*profile*/ ctx[0].name);
    			}

    			if (dirty & /*profile*/ 1 && input1.value !== /*profile*/ ctx[0].email) {
    				set_input_value(input1, /*profile*/ ctx[0].email);
    			}

    			if (dirty & /*passwordData*/ 2 && input2.value !== /*passwordData*/ ctx[1].current) {
    				set_input_value(input2, /*passwordData*/ ctx[1].current);
    			}

    			if (dirty & /*passwordData*/ 2 && input3.value !== /*passwordData*/ ctx[1].new) {
    				set_input_value(input3, /*passwordData*/ ctx[1].new);
    			}

    			if (dirty & /*passwordData*/ 2 && input4.value !== /*passwordData*/ ctx[1].confirm) {
    				set_input_value(input4, /*passwordData*/ ctx[1].confirm);
    			}

    			if (dirty & /*preferences*/ 4) {
    				input5.checked = /*preferences*/ ctx[2].emailNotifications;
    			}

    			if (dirty & /*preferences*/ 4) {
    				input6.checked = /*preferences*/ ctx[2].aiAnalysisAlerts;
    			}

    			if (dirty & /*preferences*/ 4 && input7_checked_value !== (input7_checked_value = /*preferences*/ ctx[2].darkMode)) {
    				prop_dev(input7, "checked", input7_checked_value);
    			}
    		},
    		i: function intro(local) {
    			if (!div21_intro) {
    				add_render_callback(() => {
    					div21_intro = create_in_transition(div21, fade, {});
    					div21_intro.start();
    				});
    			}
    		},
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div21);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$b.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$b($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Change', slots, []);

    	let profile = {
    		name: 'Bilal Tariq',
    		email: 'bilalchannar01@gmail.com'
    	};

    	let passwordData = { current: '', new: '', confirm: '' };

    	let preferences = {
    		emailNotifications: true,
    		aiAnalysisAlerts: true,
    		darkMode: localStorage.getItem('theme') === 'dark'
    	};

    	function saveProfile() {
    		notify("Profile updated successfully", "success");
    	}

    	function changePassword() {
    		if (passwordData.new !== passwordData.confirm) {
    			notify("Passwords do not match", "error");
    			return;
    		}

    		notify("Password changed securely", "success");
    		$$invalidate(1, passwordData = { current: '', new: '', confirm: '' });
    	}

    	function toggleDarkMode() {
    		$$invalidate(2, preferences.darkMode = !preferences.darkMode, preferences);
    		const theme = preferences.darkMode ? 'dark' : 'light';
    		document.body.classList.toggle('dark', preferences.darkMode);
    		localStorage.setItem('theme', theme);
    		notify(`Switched to ${theme} mode`, "info");
    	}

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Change> was created with unknown prop '${key}'`);
    	});

    	function input0_input_handler() {
    		profile.name = this.value;
    		$$invalidate(0, profile);
    	}

    	function input1_input_handler() {
    		profile.email = this.value;
    		$$invalidate(0, profile);
    	}

    	function input2_input_handler() {
    		passwordData.current = this.value;
    		$$invalidate(1, passwordData);
    	}

    	function input3_input_handler() {
    		passwordData.new = this.value;
    		$$invalidate(1, passwordData);
    	}

    	function input4_input_handler() {
    		passwordData.confirm = this.value;
    		$$invalidate(1, passwordData);
    	}

    	function input5_change_handler() {
    		preferences.emailNotifications = this.checked;
    		$$invalidate(2, preferences);
    	}

    	function input6_change_handler() {
    		preferences.aiAnalysisAlerts = this.checked;
    		$$invalidate(2, preferences);
    	}

    	const click_handler = () => window.location.href = '#/auth/logout';
    	const click_handler_1 = () => notify("Account deletion is restricted for this demo", "info");

    	$$self.$capture_state = () => ({
    		notify,
    		fade,
    		profile,
    		passwordData,
    		preferences,
    		saveProfile,
    		changePassword,
    		toggleDarkMode
    	});

    	$$self.$inject_state = $$props => {
    		if ('profile' in $$props) $$invalidate(0, profile = $$props.profile);
    		if ('passwordData' in $$props) $$invalidate(1, passwordData = $$props.passwordData);
    		if ('preferences' in $$props) $$invalidate(2, preferences = $$props.preferences);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		profile,
    		passwordData,
    		preferences,
    		saveProfile,
    		changePassword,
    		toggleDarkMode,
    		input0_input_handler,
    		input1_input_handler,
    		input2_input_handler,
    		input3_input_handler,
    		input4_input_handler,
    		input5_change_handler,
    		input6_change_handler,
    		click_handler,
    		click_handler_1
    	];
    }

    class Change extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$b, create_fragment$b, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Change",
    			options,
    			id: create_fragment$b.name
    		});
    	}
    }

    /* src\pages\dash\Education.svelte generated by Svelte v3.59.2 */

    const file$9 = "src\\pages\\dash\\Education.svelte";

    function create_fragment$a(ctx) {
    	let div;
    	let h2;
    	let t1;
    	let table;
    	let thead;
    	let tr0;
    	let th0;
    	let t3;
    	let th1;
    	let t5;
    	let th2;
    	let t7;
    	let th3;
    	let t9;
    	let tbody;
    	let tr1;
    	let td0;
    	let t11;
    	let td1;
    	let t13;
    	let td2;
    	let t15;
    	let td3;
    	let button0;
    	let t17;
    	let button1;
    	let t19;
    	let tr2;
    	let td4;
    	let t21;
    	let td5;
    	let t23;
    	let td6;
    	let t25;
    	let td7;
    	let button2;
    	let t27;
    	let button3;
    	let t29;
    	let tr3;
    	let td8;
    	let t31;
    	let td9;
    	let t33;
    	let td10;
    	let t35;
    	let td11;
    	let button4;
    	let t37;
    	let button5;
    	let t39;
    	let tr4;
    	let td12;
    	let t41;
    	let td13;
    	let t43;
    	let td14;
    	let t45;
    	let td15;
    	let button6;
    	let t47;
    	let button7;
    	let t49;
    	let tr5;
    	let td16;
    	let t51;
    	let td17;
    	let t53;
    	let td18;
    	let t55;
    	let td19;
    	let button8;
    	let t57;
    	let button9;

    	const block = {
    		c: function create() {
    			div = element("div");
    			h2 = element("h2");
    			h2.textContent = "Educational Background Analysis";
    			t1 = space();
    			table = element("table");
    			thead = element("thead");
    			tr0 = element("tr");
    			th0 = element("th");
    			th0.textContent = "Candidate Name";
    			t3 = space();
    			th1 = element("th");
    			th1.textContent = "Degree & Certifications";
    			t5 = space();
    			th2 = element("th");
    			th2.textContent = "Institutions";
    			t7 = space();
    			th3 = element("th");
    			th3.textContent = "Action";
    			t9 = space();
    			tbody = element("tbody");
    			tr1 = element("tr");
    			td0 = element("td");
    			td0.textContent = "Jane Smith";
    			t11 = space();
    			td1 = element("td");
    			td1.textContent = "Bachelor's in CS, AI Certification";
    			t13 = space();
    			td2 = element("td");
    			td2.textContent = "Harvard University";
    			t15 = space();
    			td3 = element("td");
    			button0 = element("button");
    			button0.textContent = "Analyze";
    			t17 = space();
    			button1 = element("button");
    			button1.textContent = "Highlight Gaps";
    			t19 = space();
    			tr2 = element("tr");
    			td4 = element("td");
    			td4.textContent = "John Doe";
    			t21 = space();
    			td5 = element("td");
    			td5.textContent = "Master's in Data Science";
    			t23 = space();
    			td6 = element("td");
    			td6.textContent = "MIT";
    			t25 = space();
    			td7 = element("td");
    			button2 = element("button");
    			button2.textContent = "Analyze";
    			t27 = space();
    			button3 = element("button");
    			button3.textContent = "Highlight Gaps";
    			t29 = space();
    			tr3 = element("tr");
    			td8 = element("td");
    			td8.textContent = "Emily White";
    			t31 = space();
    			td9 = element("td");
    			td9.textContent = "PhD in Machine Learning";
    			t33 = space();
    			td10 = element("td");
    			td10.textContent = "Stanford University";
    			t35 = space();
    			td11 = element("td");
    			button4 = element("button");
    			button4.textContent = "Analyze";
    			t37 = space();
    			button5 = element("button");
    			button5.textContent = "Highlight Gaps";
    			t39 = space();
    			tr4 = element("tr");
    			td12 = element("td");
    			td12.textContent = "Bob Johnson";
    			t41 = space();
    			td13 = element("td");
    			td13.textContent = "Bachelor's in Software Engineering";
    			t43 = space();
    			td14 = element("td");
    			td14.textContent = "California Institute of Technology";
    			t45 = space();
    			td15 = element("td");
    			button6 = element("button");
    			button6.textContent = "Analyze";
    			t47 = space();
    			button7 = element("button");
    			button7.textContent = "Highlight Gaps";
    			t49 = space();
    			tr5 = element("tr");
    			td16 = element("td");
    			td16.textContent = "Alice Brown";
    			t51 = space();
    			td17 = element("td");
    			td17.textContent = "Master's in AI and Robotics";
    			t53 = space();
    			td18 = element("td");
    			td18.textContent = "Oxford University";
    			t55 = space();
    			td19 = element("td");
    			button8 = element("button");
    			button8.textContent = "Analyze";
    			t57 = space();
    			button9 = element("button");
    			button9.textContent = "Highlight Gaps";
    			attr_dev(h2, "class", "svelte-a3xi7m");
    			add_location(h2, file$9, 3, 4, 36);
    			attr_dev(th0, "class", "svelte-a3xi7m");
    			add_location(th0, file$9, 8, 16, 144);
    			attr_dev(th1, "class", "svelte-a3xi7m");
    			add_location(th1, file$9, 9, 16, 185);
    			attr_dev(th2, "class", "svelte-a3xi7m");
    			add_location(th2, file$9, 10, 16, 235);
    			attr_dev(th3, "class", "svelte-a3xi7m");
    			add_location(th3, file$9, 11, 16, 274);
    			add_location(tr0, file$9, 7, 12, 122);
    			add_location(thead, file$9, 6, 8, 101);
    			attr_dev(td0, "class", "svelte-a3xi7m");
    			add_location(td0, file$9, 16, 16, 379);
    			attr_dev(td1, "class", "svelte-a3xi7m");
    			add_location(td1, file$9, 17, 16, 416);
    			attr_dev(td2, "class", "svelte-a3xi7m");
    			add_location(td2, file$9, 18, 16, 477);
    			attr_dev(button0, "class", "analyze-button svelte-a3xi7m");
    			add_location(button0, file$9, 20, 20, 548);
    			attr_dev(button1, "class", "highlight-button svelte-a3xi7m");
    			add_location(button1, file$9, 21, 20, 617);
    			attr_dev(td3, "class", "svelte-a3xi7m");
    			add_location(td3, file$9, 19, 16, 522);
    			add_location(tr1, file$9, 15, 12, 357);
    			attr_dev(td4, "class", "svelte-a3xi7m");
    			add_location(td4, file$9, 25, 16, 751);
    			attr_dev(td5, "class", "svelte-a3xi7m");
    			add_location(td5, file$9, 26, 16, 786);
    			attr_dev(td6, "class", "svelte-a3xi7m");
    			add_location(td6, file$9, 27, 16, 837);
    			attr_dev(button2, "class", "analyze-button svelte-a3xi7m");
    			add_location(button2, file$9, 29, 20, 893);
    			attr_dev(button3, "class", "highlight-button svelte-a3xi7m");
    			add_location(button3, file$9, 30, 20, 962);
    			attr_dev(td7, "class", "svelte-a3xi7m");
    			add_location(td7, file$9, 28, 16, 867);
    			add_location(tr2, file$9, 24, 12, 729);
    			attr_dev(td8, "class", "svelte-a3xi7m");
    			add_location(td8, file$9, 34, 16, 1096);
    			attr_dev(td9, "class", "svelte-a3xi7m");
    			add_location(td9, file$9, 35, 16, 1134);
    			attr_dev(td10, "class", "svelte-a3xi7m");
    			add_location(td10, file$9, 36, 16, 1184);
    			attr_dev(button4, "class", "analyze-button svelte-a3xi7m");
    			add_location(button4, file$9, 38, 20, 1256);
    			attr_dev(button5, "class", "highlight-button svelte-a3xi7m");
    			add_location(button5, file$9, 39, 20, 1325);
    			attr_dev(td11, "class", "svelte-a3xi7m");
    			add_location(td11, file$9, 37, 16, 1230);
    			add_location(tr3, file$9, 33, 12, 1074);
    			attr_dev(td12, "class", "svelte-a3xi7m");
    			add_location(td12, file$9, 43, 16, 1459);
    			attr_dev(td13, "class", "svelte-a3xi7m");
    			add_location(td13, file$9, 44, 16, 1497);
    			attr_dev(td14, "class", "svelte-a3xi7m");
    			add_location(td14, file$9, 45, 16, 1558);
    			attr_dev(button6, "class", "analyze-button svelte-a3xi7m");
    			add_location(button6, file$9, 47, 20, 1645);
    			attr_dev(button7, "class", "highlight-button svelte-a3xi7m");
    			add_location(button7, file$9, 48, 20, 1714);
    			attr_dev(td15, "class", "svelte-a3xi7m");
    			add_location(td15, file$9, 46, 16, 1619);
    			add_location(tr4, file$9, 42, 12, 1437);
    			attr_dev(td16, "class", "svelte-a3xi7m");
    			add_location(td16, file$9, 52, 16, 1848);
    			attr_dev(td17, "class", "svelte-a3xi7m");
    			add_location(td17, file$9, 53, 16, 1886);
    			attr_dev(td18, "class", "svelte-a3xi7m");
    			add_location(td18, file$9, 54, 16, 1940);
    			attr_dev(button8, "class", "analyze-button svelte-a3xi7m");
    			add_location(button8, file$9, 56, 20, 2010);
    			attr_dev(button9, "class", "highlight-button svelte-a3xi7m");
    			add_location(button9, file$9, 57, 20, 2079);
    			attr_dev(td19, "class", "svelte-a3xi7m");
    			add_location(td19, file$9, 55, 16, 1984);
    			add_location(tr5, file$9, 51, 12, 1826);
    			add_location(tbody, file$9, 14, 8, 336);
    			attr_dev(table, "class", "svelte-a3xi7m");
    			add_location(table, file$9, 5, 4, 84);
    			attr_dev(div, "class", "main-content svelte-a3xi7m");
    			add_location(div, file$9, 2, 0, 4);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, h2);
    			append_dev(div, t1);
    			append_dev(div, table);
    			append_dev(table, thead);
    			append_dev(thead, tr0);
    			append_dev(tr0, th0);
    			append_dev(tr0, t3);
    			append_dev(tr0, th1);
    			append_dev(tr0, t5);
    			append_dev(tr0, th2);
    			append_dev(tr0, t7);
    			append_dev(tr0, th3);
    			append_dev(table, t9);
    			append_dev(table, tbody);
    			append_dev(tbody, tr1);
    			append_dev(tr1, td0);
    			append_dev(tr1, t11);
    			append_dev(tr1, td1);
    			append_dev(tr1, t13);
    			append_dev(tr1, td2);
    			append_dev(tr1, t15);
    			append_dev(tr1, td3);
    			append_dev(td3, button0);
    			append_dev(td3, t17);
    			append_dev(td3, button1);
    			append_dev(tbody, t19);
    			append_dev(tbody, tr2);
    			append_dev(tr2, td4);
    			append_dev(tr2, t21);
    			append_dev(tr2, td5);
    			append_dev(tr2, t23);
    			append_dev(tr2, td6);
    			append_dev(tr2, t25);
    			append_dev(tr2, td7);
    			append_dev(td7, button2);
    			append_dev(td7, t27);
    			append_dev(td7, button3);
    			append_dev(tbody, t29);
    			append_dev(tbody, tr3);
    			append_dev(tr3, td8);
    			append_dev(tr3, t31);
    			append_dev(tr3, td9);
    			append_dev(tr3, t33);
    			append_dev(tr3, td10);
    			append_dev(tr3, t35);
    			append_dev(tr3, td11);
    			append_dev(td11, button4);
    			append_dev(td11, t37);
    			append_dev(td11, button5);
    			append_dev(tbody, t39);
    			append_dev(tbody, tr4);
    			append_dev(tr4, td12);
    			append_dev(tr4, t41);
    			append_dev(tr4, td13);
    			append_dev(tr4, t43);
    			append_dev(tr4, td14);
    			append_dev(tr4, t45);
    			append_dev(tr4, td15);
    			append_dev(td15, button6);
    			append_dev(td15, t47);
    			append_dev(td15, button7);
    			append_dev(tbody, t49);
    			append_dev(tbody, tr5);
    			append_dev(tr5, td16);
    			append_dev(tr5, t51);
    			append_dev(tr5, td17);
    			append_dev(tr5, t53);
    			append_dev(tr5, td18);
    			append_dev(tr5, t55);
    			append_dev(tr5, td19);
    			append_dev(td19, button8);
    			append_dev(td19, t57);
    			append_dev(td19, button9);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$a.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$a($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Education', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Education> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class Education extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$a, create_fragment$a, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Education",
    			options,
    			id: create_fragment$a.name
    		});
    	}
    }

    /* src\components\SkillTag.svelte generated by Svelte v3.59.2 */

    const file$8 = "src\\components\\SkillTag.svelte";

    function create_fragment$9(ctx) {
    	let span;
    	let t;

    	const block = {
    		c: function create() {
    			span = element("span");
    			t = text(/*skill*/ ctx[0]);
    			attr_dev(span, "class", "skill-tag svelte-1k5oeri");
    			add_location(span, file$8, 4, 0, 47);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span, anchor);
    			append_dev(span, t);
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*skill*/ 1) set_data_dev(t, /*skill*/ ctx[0]);
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(span);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$9.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$9($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('SkillTag', slots, []);
    	let { skill = "" } = $$props;
    	const writable_props = ['skill'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<SkillTag> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ('skill' in $$props) $$invalidate(0, skill = $$props.skill);
    	};

    	$$self.$capture_state = () => ({ skill });

    	$$self.$inject_state = $$props => {
    		if ('skill' in $$props) $$invalidate(0, skill = $$props.skill);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [skill];
    }

    class SkillTag extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$9, create_fragment$9, safe_not_equal, { skill: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "SkillTag",
    			options,
    			id: create_fragment$9.name
    		});
    	}

    	get skill() {
    		throw new Error("<SkillTag>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set skill(value) {
    		throw new Error("<SkillTag>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\components\StatsCard.svelte generated by Svelte v3.59.2 */

    const file$7 = "src\\components\\StatsCard.svelte";

    function create_fragment$8(ctx) {
    	let div2;
    	let div0;
    	let span;
    	let t0;
    	let t1;
    	let div1;
    	let h3;
    	let t2;
    	let t3;
    	let p;
    	let t4;

    	const block = {
    		c: function create() {
    			div2 = element("div");
    			div0 = element("div");
    			span = element("span");
    			t0 = text(/*icon*/ ctx[2]);
    			t1 = space();
    			div1 = element("div");
    			h3 = element("h3");
    			t2 = text(/*title*/ ctx[0]);
    			t3 = space();
    			p = element("p");
    			t4 = text(/*value*/ ctx[1]);
    			attr_dev(span, "class", "icon");
    			add_location(span, file$7, 9, 8, 242);
    			attr_dev(div0, "class", "icon-wrapper svelte-19xsk80");
    			add_location(div0, file$7, 8, 4, 207);
    			attr_dev(h3, "class", "svelte-19xsk80");
    			add_location(h3, file$7, 12, 8, 320);
    			attr_dev(p, "class", "value svelte-19xsk80");
    			add_location(p, file$7, 13, 8, 345);
    			attr_dev(div1, "class", "content svelte-19xsk80");
    			add_location(div1, file$7, 11, 4, 290);
    			attr_dev(div2, "class", "stats-card svelte-19xsk80");
    			set_style(div2, "--card-color", /*color*/ ctx[3]);
    			add_location(div2, file$7, 7, 0, 148);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div2, anchor);
    			append_dev(div2, div0);
    			append_dev(div0, span);
    			append_dev(span, t0);
    			append_dev(div2, t1);
    			append_dev(div2, div1);
    			append_dev(div1, h3);
    			append_dev(h3, t2);
    			append_dev(div1, t3);
    			append_dev(div1, p);
    			append_dev(p, t4);
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*icon*/ 4) set_data_dev(t0, /*icon*/ ctx[2]);
    			if (dirty & /*title*/ 1) set_data_dev(t2, /*title*/ ctx[0]);
    			if (dirty & /*value*/ 2) set_data_dev(t4, /*value*/ ctx[1]);

    			if (dirty & /*color*/ 8) {
    				set_style(div2, "--card-color", /*color*/ ctx[3]);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div2);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$8.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$8($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('StatsCard', slots, []);
    	let { title = "" } = $$props;
    	let { value = "" } = $$props;
    	let { icon = "" } = $$props;
    	let { color = "var(--accent-primary)" } = $$props;
    	const writable_props = ['title', 'value', 'icon', 'color'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<StatsCard> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ('title' in $$props) $$invalidate(0, title = $$props.title);
    		if ('value' in $$props) $$invalidate(1, value = $$props.value);
    		if ('icon' in $$props) $$invalidate(2, icon = $$props.icon);
    		if ('color' in $$props) $$invalidate(3, color = $$props.color);
    	};

    	$$self.$capture_state = () => ({ title, value, icon, color });

    	$$self.$inject_state = $$props => {
    		if ('title' in $$props) $$invalidate(0, title = $$props.title);
    		if ('value' in $$props) $$invalidate(1, value = $$props.value);
    		if ('icon' in $$props) $$invalidate(2, icon = $$props.icon);
    		if ('color' in $$props) $$invalidate(3, color = $$props.color);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [title, value, icon, color];
    }

    class StatsCard extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$8, create_fragment$8, safe_not_equal, { title: 0, value: 1, icon: 2, color: 3 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "StatsCard",
    			options,
    			id: create_fragment$8.name
    		});
    	}

    	get title() {
    		throw new Error("<StatsCard>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set title(value) {
    		throw new Error("<StatsCard>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get value() {
    		throw new Error("<StatsCard>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set value(value) {
    		throw new Error("<StatsCard>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get icon() {
    		throw new Error("<StatsCard>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set icon(value) {
    		throw new Error("<StatsCard>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get color() {
    		throw new Error("<StatsCard>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set color(value) {
    		throw new Error("<StatsCard>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\pages\dash\Manage.svelte generated by Svelte v3.59.2 */

    const { console: console_1$2 } = globals;
    const file$6 = "src\\pages\\dash\\Manage.svelte";

    function get_each_context$5(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[20] = list[i];
    	return child_ctx;
    }

    function get_each_context_1$2(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[23] = list[i];
    	return child_ctx;
    }

    // (99:4) {#if userRole === 'recruiter'}
    function create_if_block_3$1(ctx) {
    	let div;
    	let statscard0;
    	let t0;
    	let statscard1;
    	let t1;
    	let statscard2;
    	let div_intro;
    	let current;

    	statscard0 = new StatsCard({
    			props: {
    				title: "Total Candidates",
    				value: /*totalCount*/ ctx[1],
    				icon: "👥",
    				color: "#4f46e5"
    			},
    			$$inline: true
    		});

    	statscard1 = new StatsCard({
    			props: {
    				title: "Analyzed Skills",
    				value: "50+",
    				icon: "🧠",
    				color: "#10b981"
    			},
    			$$inline: true
    		});

    	statscard2 = new StatsCard({
    			props: {
    				title: "Top Matches",
    				value: "5",
    				icon: "⭐",
    				color: "#f59e0b"
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			div = element("div");
    			create_component(statscard0.$$.fragment);
    			t0 = space();
    			create_component(statscard1.$$.fragment);
    			t1 = space();
    			create_component(statscard2.$$.fragment);
    			attr_dev(div, "class", "stats-grid svelte-ahcwfo");
    			add_location(div, file$6, 99, 8, 3316);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			mount_component(statscard0, div, null);
    			append_dev(div, t0);
    			mount_component(statscard1, div, null);
    			append_dev(div, t1);
    			mount_component(statscard2, div, null);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const statscard0_changes = {};
    			if (dirty & /*totalCount*/ 2) statscard0_changes.value = /*totalCount*/ ctx[1];
    			statscard0.$set(statscard0_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(statscard0.$$.fragment, local);
    			transition_in(statscard1.$$.fragment, local);
    			transition_in(statscard2.$$.fragment, local);

    			if (!div_intro) {
    				add_render_callback(() => {
    					div_intro = create_in_transition(div, fade, {});
    					div_intro.start();
    				});
    			}

    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(statscard0.$$.fragment, local);
    			transition_out(statscard1.$$.fragment, local);
    			transition_out(statscard2.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_component(statscard0);
    			destroy_component(statscard1);
    			destroy_component(statscard2);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_3$1.name,
    		type: "if",
    		source: "(99:4) {#if userRole === 'recruiter'}",
    		ctx
    	});

    	return block;
    }

    // (151:20) {:else}
    function create_else_block$4(ctx) {
    	let p;

    	const block = {
    		c: function create() {
    			p = element("p");
    			p.textContent = "No skills extracted";
    			attr_dev(p, "class", "no-skills svelte-ahcwfo");
    			add_location(p, file$6, 151, 24, 5886);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block$4.name,
    		type: "else",
    		source: "(151:20) {:else}",
    		ctx
    	});

    	return block;
    }

    // (144:20) {#if resume.skills && resume.skills.length > 0}
    function create_if_block_1$5(ctx) {
    	let t;
    	let if_block_anchor;
    	let current;
    	let each_value_1 = /*resume*/ ctx[20].skills.slice(0, 6);
    	validate_each_argument(each_value_1);
    	let each_blocks = [];

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		each_blocks[i] = create_each_block_1$2(get_each_context_1$2(ctx, each_value_1, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	let if_block = /*resume*/ ctx[20].skills.length > 6 && create_if_block_2$2(ctx);

    	const block = {
    		c: function create() {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t = space();
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				if (each_blocks[i]) {
    					each_blocks[i].m(target, anchor);
    				}
    			}

    			insert_dev(target, t, anchor);
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*filteredResumes*/ 16) {
    				each_value_1 = /*resume*/ ctx[20].skills.slice(0, 6);
    				validate_each_argument(each_value_1);
    				let i;

    				for (i = 0; i < each_value_1.length; i += 1) {
    					const child_ctx = get_each_context_1$2(ctx, each_value_1, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block_1$2(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(t.parentNode, t);
    					}
    				}

    				group_outros();

    				for (i = each_value_1.length; i < each_blocks.length; i += 1) {
    					out(i);
    				}

    				check_outros();
    			}

    			if (/*resume*/ ctx[20].skills.length > 6) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block_2$2(ctx);
    					if_block.c();
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}
    		},
    		i: function intro(local) {
    			if (current) return;

    			for (let i = 0; i < each_value_1.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o: function outro(local) {
    			each_blocks = each_blocks.filter(Boolean);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach_dev(t);
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1$5.name,
    		type: "if",
    		source: "(144:20) {#if resume.skills && resume.skills.length > 0}",
    		ctx
    	});

    	return block;
    }

    // (145:24) {#each resume.skills.slice(0, 6) as skill}
    function create_each_block_1$2(ctx) {
    	let skilltag;
    	let current;

    	skilltag = new SkillTag({
    			props: { skill: /*skill*/ ctx[23] },
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(skilltag.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(skilltag, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const skilltag_changes = {};
    			if (dirty & /*filteredResumes*/ 16) skilltag_changes.skill = /*skill*/ ctx[23];
    			skilltag.$set(skilltag_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(skilltag.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(skilltag.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(skilltag, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_1$2.name,
    		type: "each",
    		source: "(145:24) {#each resume.skills.slice(0, 6) as skill}",
    		ctx
    	});

    	return block;
    }

    // (148:24) {#if resume.skills.length > 6}
    function create_if_block_2$2(ctx) {
    	let span;
    	let t0;
    	let t1_value = /*resume*/ ctx[20].skills.length - 6 + "";
    	let t1;
    	let t2;

    	const block = {
    		c: function create() {
    			span = element("span");
    			t0 = text("+");
    			t1 = text(t1_value);
    			t2 = text(" more");
    			attr_dev(span, "class", "more-count svelte-ahcwfo");
    			add_location(span, file$6, 148, 28, 5739);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span, anchor);
    			append_dev(span, t0);
    			append_dev(span, t1);
    			append_dev(span, t2);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*filteredResumes*/ 16 && t1_value !== (t1_value = /*resume*/ ctx[20].skills.length - 6 + "")) set_data_dev(t1, t1_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(span);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2$2.name,
    		type: "if",
    		source: "(148:24) {#if resume.skills.length > 6}",
    		ctx
    	});

    	return block;
    }

    // (132:8) {#each filteredResumes as resume (resume._id.$oid)}
    function create_each_block$5(key_1, ctx) {
    	let div5;
    	let div2;
    	let div0;
    	let t0_value = /*resume*/ ctx[20].name[0] + "";
    	let t0;
    	let t1;
    	let div1;
    	let h3;
    	let t2_value = /*resume*/ ctx[20].name + "";
    	let t2;
    	let t3;
    	let p;
    	let t4;
    	let t5_value = new Date(/*resume*/ ctx[20].uploaded_at?.$date || Date.now()).toLocaleDateString() + "";
    	let t5;
    	let t6;
    	let button;
    	let t8;
    	let div3;
    	let current_block_type_index;
    	let if_block;
    	let t9;
    	let div4;
    	let a;
    	let t11;
    	let div5_intro;
    	let current;
    	let mounted;
    	let dispose;

    	function click_handler_1() {
    		return /*click_handler_1*/ ctx[16](/*resume*/ ctx[20]);
    	}

    	const if_block_creators = [create_if_block_1$5, create_else_block$4];
    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (/*resume*/ ctx[20].skills && /*resume*/ ctx[20].skills.length > 0) return 0;
    		return 1;
    	}

    	current_block_type_index = select_block_type(ctx);
    	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	const block = {
    		key: key_1,
    		first: null,
    		c: function create() {
    			div5 = element("div");
    			div2 = element("div");
    			div0 = element("div");
    			t0 = text(t0_value);
    			t1 = space();
    			div1 = element("div");
    			h3 = element("h3");
    			t2 = text(t2_value);
    			t3 = space();
    			p = element("p");
    			t4 = text("Uploaded: ");
    			t5 = text(t5_value);
    			t6 = space();
    			button = element("button");
    			button.textContent = "🗑️";
    			t8 = space();
    			div3 = element("div");
    			if_block.c();
    			t9 = space();
    			div4 = element("div");
    			a = element("a");
    			a.textContent = "AI Match Analysis";
    			t11 = space();
    			attr_dev(div0, "class", "avatar svelte-ahcwfo");
    			add_location(div0, file$6, 134, 20, 4965);
    			attr_dev(h3, "class", "svelte-ahcwfo");
    			add_location(h3, file$6, 136, 24, 5071);
    			attr_dev(p, "class", "date svelte-ahcwfo");
    			add_location(p, file$6, 137, 24, 5118);
    			attr_dev(div1, "class", "info svelte-ahcwfo");
    			add_location(div1, file$6, 135, 20, 5028);
    			attr_dev(button, "class", "delete-btn svelte-ahcwfo");
    			add_location(button, file$6, 139, 20, 5268);
    			attr_dev(div2, "class", "card-header svelte-ahcwfo");
    			add_location(div2, file$6, 133, 16, 4919);
    			attr_dev(div3, "class", "skills-section svelte-ahcwfo");
    			add_location(div3, file$6, 142, 16, 5411);
    			attr_dev(a, "href", "/#/dash/rank");
    			attr_dev(a, "class", "rank-link svelte-ahcwfo");
    			add_location(a, file$6, 156, 20, 6043);
    			attr_dev(div4, "class", "card-footer svelte-ahcwfo");
    			add_location(div4, file$6, 155, 16, 5997);
    			attr_dev(div5, "class", "resume-card svelte-ahcwfo");
    			add_location(div5, file$6, 132, 12, 4843);
    			this.first = div5;
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div5, anchor);
    			append_dev(div5, div2);
    			append_dev(div2, div0);
    			append_dev(div0, t0);
    			append_dev(div2, t1);
    			append_dev(div2, div1);
    			append_dev(div1, h3);
    			append_dev(h3, t2);
    			append_dev(div1, t3);
    			append_dev(div1, p);
    			append_dev(p, t4);
    			append_dev(p, t5);
    			append_dev(div2, t6);
    			append_dev(div2, button);
    			append_dev(div5, t8);
    			append_dev(div5, div3);
    			if_blocks[current_block_type_index].m(div3, null);
    			append_dev(div5, t9);
    			append_dev(div5, div4);
    			append_dev(div4, a);
    			append_dev(div5, t11);
    			current = true;

    			if (!mounted) {
    				dispose = listen_dev(button, "click", click_handler_1, false, false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    			if ((!current || dirty & /*filteredResumes*/ 16) && t0_value !== (t0_value = /*resume*/ ctx[20].name[0] + "")) set_data_dev(t0, t0_value);
    			if ((!current || dirty & /*filteredResumes*/ 16) && t2_value !== (t2_value = /*resume*/ ctx[20].name + "")) set_data_dev(t2, t2_value);
    			if ((!current || dirty & /*filteredResumes*/ 16) && t5_value !== (t5_value = new Date(/*resume*/ ctx[20].uploaded_at?.$date || Date.now()).toLocaleDateString() + "")) set_data_dev(t5, t5_value);
    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(ctx);

    			if (current_block_type_index === previous_block_index) {
    				if_blocks[current_block_type_index].p(ctx, dirty);
    			} else {
    				group_outros();

    				transition_out(if_blocks[previous_block_index], 1, 1, () => {
    					if_blocks[previous_block_index] = null;
    				});

    				check_outros();
    				if_block = if_blocks[current_block_type_index];

    				if (!if_block) {
    					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block.c();
    				} else {
    					if_block.p(ctx, dirty);
    				}

    				transition_in(if_block, 1);
    				if_block.m(div3, null);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);

    			if (!div5_intro) {
    				add_render_callback(() => {
    					div5_intro = create_in_transition(div5, fly, { y: 20, duration: 400 });
    					div5_intro.start();
    				});
    			}

    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div5);
    			if_blocks[current_block_type_index].d();
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block$5.name,
    		type: "each",
    		source: "(132:8) {#each filteredResumes as resume (resume._id.$oid)}",
    		ctx
    	});

    	return block;
    }

    // (163:4) {#if filteredResumes.length === 0}
    function create_if_block$6(ctx) {
    	let div;
    	let p;

    	const block = {
    		c: function create() {
    			div = element("div");
    			p = element("p");
    			p.textContent = "No candidates found matching your search.";
    			add_location(p, file$6, 164, 12, 6261);
    			attr_dev(div, "class", "empty-state svelte-ahcwfo");
    			add_location(div, file$6, 163, 8, 6223);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, p);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$6.name,
    		type: "if",
    		source: "(163:4) {#if filteredResumes.length === 0}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$7(ctx) {
    	let div6;
    	let div0;
    	let h2;
    	let t1;
    	let p0;
    	let t3;
    	let t4;
    	let div3;
    	let div1;
    	let span0;
    	let t6;
    	let input0;
    	let t7;
    	let div2;
    	let input1;
    	let t8;
    	let button;
    	let span1;
    	let t10;

    	let t11_value = (/*userRole*/ ctx[5] === 'recruiter'
    	? 'Import Resume'
    	: 'Update My Resume') + "";

    	let t11;
    	let t12;
    	let div4;
    	let p1;

    	let t13_value = (/*isDragging*/ ctx[3]
    	? "Drop it here!"
    	: /*userRole*/ ctx[5] === 'recruiter'
    		? "Drag and drop PDF resumes here to auto-analyze"
    		: "Drag and drop your latest resume here to update your profile") + "";

    	let t13;
    	let t14;
    	let div5;
    	let each_blocks = [];
    	let each_1_lookup = new Map();
    	let t15;
    	let current;
    	let mounted;
    	let dispose;
    	let if_block0 = /*userRole*/ ctx[5] === 'recruiter' && create_if_block_3$1(ctx);
    	let each_value = /*filteredResumes*/ ctx[4];
    	validate_each_argument(each_value);
    	const get_key = ctx => /*resume*/ ctx[20]._id.$oid;
    	validate_each_keys(ctx, each_value, get_each_context$5, get_key);

    	for (let i = 0; i < each_value.length; i += 1) {
    		let child_ctx = get_each_context$5(ctx, each_value, i);
    		let key = get_key(child_ctx);
    		each_1_lookup.set(key, each_blocks[i] = create_each_block$5(key, child_ctx));
    	}

    	let if_block1 = /*filteredResumes*/ ctx[4].length === 0 && create_if_block$6(ctx);

    	const block = {
    		c: function create() {
    			div6 = element("div");
    			div0 = element("div");
    			h2 = element("h2");

    			h2.textContent = `${/*userRole*/ ctx[5] === 'recruiter'
			? 'Talent Database'
			: 'My Professional Portfolio'}`;

    			t1 = space();
    			p0 = element("p");

    			p0.textContent = `${/*userRole*/ ctx[5] === 'recruiter'
			? 'Manage and analyze all candidate resumes in your system'
			: 'Update and manage your personal professional documents'}`;

    			t3 = space();
    			if (if_block0) if_block0.c();
    			t4 = space();
    			div3 = element("div");
    			div1 = element("div");
    			span0 = element("span");
    			span0.textContent = "🔍";
    			t6 = space();
    			input0 = element("input");
    			t7 = space();
    			div2 = element("div");
    			input1 = element("input");
    			t8 = space();
    			button = element("button");
    			span1 = element("span");
    			span1.textContent = "+";
    			t10 = space();
    			t11 = text(t11_value);
    			t12 = space();
    			div4 = element("div");
    			p1 = element("p");
    			t13 = text(t13_value);
    			t14 = space();
    			div5 = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t15 = space();
    			if (if_block1) if_block1.c();
    			attr_dev(h2, "class", "svelte-ahcwfo");
    			add_location(h2, file$6, 94, 8, 3014);
    			attr_dev(p0, "class", "svelte-ahcwfo");
    			add_location(p0, file$6, 95, 8, 3108);
    			attr_dev(div0, "class", "glass-header-title svelte-ahcwfo");
    			add_location(div0, file$6, 93, 4, 2973);
    			attr_dev(span0, "class", "search-icon svelte-ahcwfo");
    			add_location(span0, file$6, 108, 12, 3718);
    			attr_dev(input0, "type", "text");

    			attr_dev(input0, "placeholder", /*userRole*/ ctx[5] === 'recruiter'
    			? "Search by name or skill..."
    			: "Search my skills...");

    			attr_dev(input0, "class", "svelte-ahcwfo");
    			add_location(input0, file$6, 109, 12, 3766);
    			attr_dev(div1, "class", "search-wrapper svelte-ahcwfo");
    			add_location(div1, file$6, 107, 8, 3677);
    			attr_dev(input1, "type", "file");
    			set_style(input1, "display", "none");
    			add_location(input1, file$6, 113, 12, 3980);
    			add_location(span1, file$6, 115, 16, 4191);
    			attr_dev(button, "class", "primary-btn svelte-ahcwfo");
    			add_location(button, file$6, 114, 12, 4111);
    			attr_dev(div2, "class", "upload-section");
    			add_location(div2, file$6, 112, 8, 3939);
    			attr_dev(div3, "class", "action-bar svelte-ahcwfo");
    			add_location(div3, file$6, 106, 4, 3644);
    			add_location(p1, file$6, 127, 8, 4546);
    			attr_dev(div4, "class", "drop-zone svelte-ahcwfo");
    			toggle_class(div4, "dragging", /*isDragging*/ ctx[3]);
    			add_location(div4, file$6, 120, 4, 4325);
    			attr_dev(div5, "class", "resume-grid svelte-ahcwfo");
    			add_location(div5, file$6, 130, 4, 4745);
    			attr_dev(div6, "class", "manage-page svelte-ahcwfo");
    			add_location(div6, file$6, 92, 0, 2943);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div6, anchor);
    			append_dev(div6, div0);
    			append_dev(div0, h2);
    			append_dev(div0, t1);
    			append_dev(div0, p0);
    			append_dev(div6, t3);
    			if (if_block0) if_block0.m(div6, null);
    			append_dev(div6, t4);
    			append_dev(div6, div3);
    			append_dev(div3, div1);
    			append_dev(div1, span0);
    			append_dev(div1, t6);
    			append_dev(div1, input0);
    			set_input_value(input0, /*searchQuery*/ ctx[0]);
    			append_dev(div3, t7);
    			append_dev(div3, div2);
    			append_dev(div2, input1);
    			/*input1_binding*/ ctx[11](input1);
    			append_dev(div2, t8);
    			append_dev(div2, button);
    			append_dev(button, span1);
    			append_dev(button, t10);
    			append_dev(button, t11);
    			append_dev(div6, t12);
    			append_dev(div6, div4);
    			append_dev(div4, p1);
    			append_dev(p1, t13);
    			append_dev(div6, t14);
    			append_dev(div6, div5);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				if (each_blocks[i]) {
    					each_blocks[i].m(div5, null);
    				}
    			}

    			append_dev(div6, t15);
    			if (if_block1) if_block1.m(div6, null);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(input0, "input", /*input0_input_handler*/ ctx[10]),
    					listen_dev(input1, "change", /*change_handler*/ ctx[12], false, false, false, false),
    					listen_dev(button, "click", /*click_handler*/ ctx[13], false, false, false, false),
    					listen_dev(div4, "dragover", prevent_default(/*dragover_handler*/ ctx[14]), false, true, false, false),
    					listen_dev(div4, "dragleave", /*dragleave_handler*/ ctx[15], false, false, false, false),
    					listen_dev(div4, "drop", /*handleDrop*/ ctx[8], false, false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (/*userRole*/ ctx[5] === 'recruiter') if_block0.p(ctx, dirty);

    			if (dirty & /*searchQuery*/ 1 && input0.value !== /*searchQuery*/ ctx[0]) {
    				set_input_value(input0, /*searchQuery*/ ctx[0]);
    			}

    			if ((!current || dirty & /*isDragging*/ 8) && t13_value !== (t13_value = (/*isDragging*/ ctx[3]
    			? "Drop it here!"
    			: /*userRole*/ ctx[5] === 'recruiter'
    				? "Drag and drop PDF resumes here to auto-analyze"
    				: "Drag and drop your latest resume here to update your profile") + "")) set_data_dev(t13, t13_value);

    			if (!current || dirty & /*isDragging*/ 8) {
    				toggle_class(div4, "dragging", /*isDragging*/ ctx[3]);
    			}

    			if (dirty & /*filteredResumes, deleteResume, Date*/ 144) {
    				each_value = /*filteredResumes*/ ctx[4];
    				validate_each_argument(each_value);
    				group_outros();
    				validate_each_keys(ctx, each_value, get_each_context$5, get_key);
    				each_blocks = update_keyed_each(each_blocks, dirty, get_key, 1, ctx, each_value, each_1_lookup, div5, outro_and_destroy_block, create_each_block$5, null, get_each_context$5);
    				check_outros();
    			}

    			if (/*filteredResumes*/ ctx[4].length === 0) {
    				if (if_block1) ; else {
    					if_block1 = create_if_block$6(ctx);
    					if_block1.c();
    					if_block1.m(div6, null);
    				}
    			} else if (if_block1) {
    				if_block1.d(1);
    				if_block1 = null;
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block0);

    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block0);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div6);
    			if (if_block0) if_block0.d();
    			/*input1_binding*/ ctx[11](null);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].d();
    			}

    			if (if_block1) if_block1.d();
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$7.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$7($$self, $$props, $$invalidate) {
    	let filteredResumes;
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Manage', slots, []);
    	let resumes = [];
    	let totalCount = 0;
    	let fileInput;
    	let searchQuery = "";
    	let isDragging = false;
    	let userRole = localStorage.getItem('role') || 'candidate';
    	let userName = localStorage.getItem('name') || 'User';
    	let userEmail = localStorage.getItem('email') || '';

    	onMount(async () => {
    		fetchResumes();
    	});

    	async function fetchResumes() {
    		try {
    			// Build URL with optional email filter
    			let url = 'http://127.0.0.1:3000/api/resumes/list';

    			if (userRole === 'candidate') {
    				url += `?owner_email=${userEmail}`;
    			}

    			const res = await fetch(url);
    			const result = await res.json();

    			if (result.success) {
    				$$invalidate(9, resumes = result.data);
    				$$invalidate(1, totalCount = resumes.length);
    			}
    		} catch(err) {
    			console.error("Error fetching resumes:", err);
    			notify("Failed to load resumes", "error");
    		}
    	}

    	async function handleFileUpload(files) {
    		if (!files || files.length === 0) return;
    		const formData = new FormData();
    		formData.append('file', files[0]);
    		formData.append('owner_email', userEmail); // Tag upload with owner

    		try {
    			const res = await fetch('http://127.0.0.1:3000/api/resumes/upload', { method: 'POST', body: formData });

    			if (res.ok) {
    				notify("Resume uploaded & analyzed successfully", "success");
    				fetchResumes();
    			} else {
    				notify("Upload failed", "error");
    			}
    		} catch(err) {
    			console.error(err);
    			notify("Error uploading resume", "error");
    		}
    	}

    	async function deleteResume(id) {
    		try {
    			const res = await fetch(`http://127.0.0.1:3000/api/resumes/delete_by_id/${id}`, { method: 'DELETE' });

    			if (res.ok) {
    				notify("Resume deleted successfully", "success");
    				fetchResumes();
    			}
    		} catch(err) {
    			console.error(err);
    			notify("Delete failed", "error");
    		}
    	}

    	function handleDrop(e) {
    		e.preventDefault();
    		$$invalidate(3, isDragging = false);
    		handleFileUpload(e.dataTransfer.files);
    	}

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console_1$2.warn(`<Manage> was created with unknown prop '${key}'`);
    	});

    	function input0_input_handler() {
    		searchQuery = this.value;
    		$$invalidate(0, searchQuery);
    	}

    	function input1_binding($$value) {
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			fileInput = $$value;
    			$$invalidate(2, fileInput);
    		});
    	}

    	const change_handler = e => handleFileUpload(e.target.files);
    	const click_handler = () => fileInput.click();
    	const dragover_handler = () => $$invalidate(3, isDragging = true);
    	const dragleave_handler = () => $$invalidate(3, isDragging = false);
    	const click_handler_1 = resume => deleteResume(resume._id.$oid);

    	$$self.$capture_state = () => ({
    		onMount,
    		notify,
    		fade,
    		fly,
    		SkillTag,
    		StatsCard,
    		push,
    		resumes,
    		totalCount,
    		fileInput,
    		searchQuery,
    		isDragging,
    		userRole,
    		userName,
    		userEmail,
    		fetchResumes,
    		handleFileUpload,
    		deleteResume,
    		handleDrop,
    		filteredResumes
    	});

    	$$self.$inject_state = $$props => {
    		if ('resumes' in $$props) $$invalidate(9, resumes = $$props.resumes);
    		if ('totalCount' in $$props) $$invalidate(1, totalCount = $$props.totalCount);
    		if ('fileInput' in $$props) $$invalidate(2, fileInput = $$props.fileInput);
    		if ('searchQuery' in $$props) $$invalidate(0, searchQuery = $$props.searchQuery);
    		if ('isDragging' in $$props) $$invalidate(3, isDragging = $$props.isDragging);
    		if ('userRole' in $$props) $$invalidate(5, userRole = $$props.userRole);
    		if ('userName' in $$props) userName = $$props.userName;
    		if ('userEmail' in $$props) userEmail = $$props.userEmail;
    		if ('filteredResumes' in $$props) $$invalidate(4, filteredResumes = $$props.filteredResumes);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*resumes, searchQuery*/ 513) {
    			$$invalidate(4, filteredResumes = resumes.filter(r => r.name.toLowerCase().includes(searchQuery.toLowerCase()) || r.skills && r.skills.some(s => s.toLowerCase().includes(searchQuery.toLowerCase()))));
    		}
    	};

    	return [
    		searchQuery,
    		totalCount,
    		fileInput,
    		isDragging,
    		filteredResumes,
    		userRole,
    		handleFileUpload,
    		deleteResume,
    		handleDrop,
    		resumes,
    		input0_input_handler,
    		input1_binding,
    		change_handler,
    		click_handler,
    		dragover_handler,
    		dragleave_handler,
    		click_handler_1
    	];
    }

    class Manage extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$7, create_fragment$7, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Manage",
    			options,
    			id: create_fragment$7.name
    		});
    	}
    }

    // Store for holding the current candidate's AI analysis report
    const reasoningReport = writable(null);

    /* src\pages\dash\Rank.svelte generated by Svelte v3.59.2 */

    const { console: console_1$1 } = globals;
    const file$5 = "src\\pages\\dash\\Rank.svelte";

    function get_each_context$4(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[15] = list[i];
    	child_ctx[17] = i;
    	return child_ctx;
    }

    // (76:16) {:else}
    function create_else_block$3(ctx) {
    	let t_value = (/*userRole*/ ctx[4] === 'recruiter'
    	? '✨ Start AI Ranking'
    	: '🚀 Analyze My Match') + "";

    	let t;

    	const block = {
    		c: function create() {
    			t = text(t_value);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block$3.name,
    		type: "else",
    		source: "(76:16) {:else}",
    		ctx
    	});

    	return block;
    }

    // (74:16) {#if isRanking}
    function create_if_block_2$1(ctx) {
    	let span;
    	let t;

    	const block = {
    		c: function create() {
    			span = element("span");
    			t = text(" Analyzing...");
    			attr_dev(span, "class", "spinner svelte-1pa3ltu");
    			add_location(span, file$5, 74, 20, 2800);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span, anchor);
    			insert_dev(target, t, anchor);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(span);
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2$1.name,
    		type: "if",
    		source: "(74:16) {#if isRanking}",
    		ctx
    	});

    	return block;
    }

    // (89:4) {#if results.length > 0}
    function create_if_block_1$4(ctx) {
    	let div2;
    	let div0;
    	let h3;

    	let t0_value = (/*userRole*/ ctx[4] === 'recruiter'
    	? `Match Results (${/*results*/ ctx[1].length})`
    	: 'Your Match Analysis') + "";

    	let t0;
    	let t1;
    	let div1;
    	let div2_intro;
    	let current;
    	let each_value = /*results*/ ctx[1];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$4(get_each_context$4(ctx, each_value, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	const block = {
    		c: function create() {
    			div2 = element("div");
    			div0 = element("div");
    			h3 = element("h3");
    			t0 = text(t0_value);
    			t1 = space();
    			div1 = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			add_location(h3, file$5, 91, 16, 3347);
    			attr_dev(div0, "class", "section-header");
    			add_location(div0, file$5, 90, 12, 3302);
    			attr_dev(div1, "class", "results-grid svelte-1pa3ltu");
    			add_location(div1, file$5, 94, 12, 3489);
    			attr_dev(div2, "class", "results-section");
    			add_location(div2, file$5, 89, 8, 3252);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div2, anchor);
    			append_dev(div2, div0);
    			append_dev(div0, h3);
    			append_dev(h3, t0);
    			append_dev(div2, t1);
    			append_dev(div2, div1);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				if (each_blocks[i]) {
    					each_blocks[i].m(div1, null);
    				}
    			}

    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if ((!current || dirty & /*results*/ 2) && t0_value !== (t0_value = (/*userRole*/ ctx[4] === 'recruiter'
    			? `Match Results (${/*results*/ ctx[1].length})`
    			: 'Your Match Analysis') + "")) set_data_dev(t0, t0_value);

    			if (dirty & /*showReasoning, results, viewPdf*/ 194) {
    				each_value = /*results*/ ctx[1];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$4(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block$4(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(div1, null);
    					}
    				}

    				group_outros();

    				for (i = each_value.length; i < each_blocks.length; i += 1) {
    					out(i);
    				}

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;

    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			if (!div2_intro) {
    				add_render_callback(() => {
    					div2_intro = create_in_transition(div2, fade, {});
    					div2_intro.start();
    				});
    			}

    			current = true;
    		},
    		o: function outro(local) {
    			each_blocks = each_blocks.filter(Boolean);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div2);
    			destroy_each(each_blocks, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1$4.name,
    		type: "if",
    		source: "(89:4) {#if results.length > 0}",
    		ctx
    	});

    	return block;
    }

    // (96:16) {#each results as result, index}
    function create_each_block$4(ctx) {
    	let div6;
    	let div0;
    	let t0;
    	let t1_value = /*index*/ ctx[17] + 1 + "";
    	let t1;
    	let t2;
    	let div5;
    	let div2;
    	let h4;
    	let t3_value = /*result*/ ctx[15].name + "";
    	let t3;
    	let t4;
    	let div1;
    	let t5_value = /*result*/ ctx[15].score + "";
    	let t5;
    	let t6;
    	let t7;
    	let p;
    	let t8;
    	let t9_value = /*result*/ ctx[15].filename.split('_').slice(1).join('_') + "";
    	let t9;
    	let t10;
    	let div3;
    	let skilltag0;
    	let t11;
    	let skilltag1;
    	let t12;
    	let div4;
    	let button0;
    	let t14;
    	let button1;
    	let t16;
    	let div6_intro;
    	let current;
    	let mounted;
    	let dispose;

    	skilltag0 = new SkillTag({
    			props: { skill: "Extracted Match" },
    			$$inline: true
    		});

    	skilltag1 = new SkillTag({
    			props: { skill: "AI Verified" },
    			$$inline: true
    		});

    	function click_handler_1() {
    		return /*click_handler_1*/ ctx[10](/*result*/ ctx[15]);
    	}

    	function click_handler_2() {
    		return /*click_handler_2*/ ctx[11](/*result*/ ctx[15]);
    	}

    	const block = {
    		c: function create() {
    			div6 = element("div");
    			div0 = element("div");
    			t0 = text("#");
    			t1 = text(t1_value);
    			t2 = space();
    			div5 = element("div");
    			div2 = element("div");
    			h4 = element("h4");
    			t3 = text(t3_value);
    			t4 = space();
    			div1 = element("div");
    			t5 = text(t5_value);
    			t6 = text("% Match");
    			t7 = space();
    			p = element("p");
    			t8 = text("📄 ");
    			t9 = text(t9_value);
    			t10 = space();
    			div3 = element("div");
    			create_component(skilltag0.$$.fragment);
    			t11 = space();
    			create_component(skilltag1.$$.fragment);
    			t12 = space();
    			div4 = element("div");
    			button0 = element("button");
    			button0.textContent = "👁️ View Resume";
    			t14 = space();
    			button1 = element("button");
    			button1.textContent = "View Reasoning";
    			t16 = space();
    			attr_dev(div0, "class", "rank-badge svelte-1pa3ltu");
    			add_location(div0, file$5, 97, 24, 3674);
    			attr_dev(h4, "class", "svelte-1pa3ltu");
    			add_location(h4, file$5, 100, 32, 3852);
    			attr_dev(div1, "class", "score-pill svelte-1pa3ltu");

    			set_style(div1, "--score-color", /*result*/ ctx[15].score > 80
    			? '#10b981'
    			: /*result*/ ctx[15].score > 50 ? '#f59e0b' : '#64748b');

    			add_location(div1, file$5, 101, 32, 3907);
    			attr_dev(div2, "class", "main-info svelte-1pa3ltu");
    			add_location(div2, file$5, 99, 28, 3796);
    			attr_dev(p, "class", "filename svelte-1pa3ltu");
    			add_location(p, file$5, 106, 28, 4220);
    			attr_dev(div3, "class", "skills-preview svelte-1pa3ltu");
    			add_location(div3, file$5, 108, 28, 4352);
    			attr_dev(button0, "class", "secondary-btn svelte-1pa3ltu");
    			add_location(button0, file$5, 114, 32, 4633);
    			attr_dev(button1, "class", "text-btn svelte-1pa3ltu");
    			add_location(button1, file$5, 115, 32, 4762);
    			attr_dev(div4, "class", "actions svelte-1pa3ltu");
    			add_location(div4, file$5, 113, 28, 4579);
    			attr_dev(div5, "class", "card-content svelte-1pa3ltu");
    			add_location(div5, file$5, 98, 24, 3741);
    			attr_dev(div6, "class", "result-card svelte-1pa3ltu");
    			add_location(div6, file$5, 96, 20, 3585);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div6, anchor);
    			append_dev(div6, div0);
    			append_dev(div0, t0);
    			append_dev(div0, t1);
    			append_dev(div6, t2);
    			append_dev(div6, div5);
    			append_dev(div5, div2);
    			append_dev(div2, h4);
    			append_dev(h4, t3);
    			append_dev(div2, t4);
    			append_dev(div2, div1);
    			append_dev(div1, t5);
    			append_dev(div1, t6);
    			append_dev(div5, t7);
    			append_dev(div5, p);
    			append_dev(p, t8);
    			append_dev(p, t9);
    			append_dev(div5, t10);
    			append_dev(div5, div3);
    			mount_component(skilltag0, div3, null);
    			append_dev(div3, t11);
    			mount_component(skilltag1, div3, null);
    			append_dev(div5, t12);
    			append_dev(div5, div4);
    			append_dev(div4, button0);
    			append_dev(div4, t14);
    			append_dev(div4, button1);
    			append_dev(div6, t16);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(button0, "click", click_handler_1, false, false, false, false),
    					listen_dev(button1, "click", click_handler_2, false, false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    			if ((!current || dirty & /*results*/ 2) && t3_value !== (t3_value = /*result*/ ctx[15].name + "")) set_data_dev(t3, t3_value);
    			if ((!current || dirty & /*results*/ 2) && t5_value !== (t5_value = /*result*/ ctx[15].score + "")) set_data_dev(t5, t5_value);

    			if (!current || dirty & /*results*/ 2) {
    				set_style(div1, "--score-color", /*result*/ ctx[15].score > 80
    				? '#10b981'
    				: /*result*/ ctx[15].score > 50 ? '#f59e0b' : '#64748b');
    			}

    			if ((!current || dirty & /*results*/ 2) && t9_value !== (t9_value = /*result*/ ctx[15].filename.split('_').slice(1).join('_') + "")) set_data_dev(t9, t9_value);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(skilltag0.$$.fragment, local);
    			transition_in(skilltag1.$$.fragment, local);

    			if (!div6_intro) {
    				add_render_callback(() => {
    					div6_intro = create_in_transition(div6, fly, { y: 20, delay: /*index*/ ctx[17] * 100 });
    					div6_intro.start();
    				});
    			}

    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(skilltag0.$$.fragment, local);
    			transition_out(skilltag1.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div6);
    			destroy_component(skilltag0);
    			destroy_component(skilltag1);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block$4.name,
    		type: "each",
    		source: "(96:16) {#each results as result, index}",
    		ctx
    	});

    	return block;
    }

    // (125:4) {#if selectedPdf}
    function create_if_block$5(ctx) {
    	let div2;
    	let div1;
    	let div0;
    	let h3;
    	let t1;
    	let button;
    	let t3;
    	let iframe;
    	let iframe_src_value;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div2 = element("div");
    			div1 = element("div");
    			div0 = element("div");
    			h3 = element("h3");
    			h3.textContent = "Resume Preview";
    			t1 = space();
    			button = element("button");
    			button.textContent = "×";
    			t3 = space();
    			iframe = element("iframe");
    			add_location(h3, file$5, 128, 20, 5234);
    			attr_dev(button, "class", "close-btn svelte-1pa3ltu");
    			add_location(button, file$5, 129, 20, 5278);
    			attr_dev(div0, "class", "modal-header svelte-1pa3ltu");
    			add_location(div0, file$5, 127, 16, 5187);
    			if (!src_url_equal(iframe.src, iframe_src_value = /*selectedPdf*/ ctx[3])) attr_dev(iframe, "src", iframe_src_value);
    			attr_dev(iframe, "title", "PDF Preview");
    			attr_dev(iframe, "width", "100%");
    			attr_dev(iframe, "height", "800px");
    			add_location(iframe, file$5, 131, 16, 5396);
    			attr_dev(div1, "class", "modal-content svelte-1pa3ltu");
    			add_location(div1, file$5, 126, 12, 5118);
    			attr_dev(div2, "class", "modal-overlay svelte-1pa3ltu");
    			add_location(div2, file$5, 125, 8, 5042);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div2, anchor);
    			append_dev(div2, div1);
    			append_dev(div1, div0);
    			append_dev(div0, h3);
    			append_dev(div0, t1);
    			append_dev(div0, button);
    			append_dev(div1, t3);
    			append_dev(div1, iframe);

    			if (!mounted) {
    				dispose = [
    					listen_dev(button, "click", /*click_handler_3*/ ctx[12], false, false, false, false),
    					listen_dev(div1, "click", stop_propagation(/*click_handler*/ ctx[8]), false, false, true, false),
    					listen_dev(div2, "click", /*click_handler_4*/ ctx[13], false, false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*selectedPdf*/ 8 && !src_url_equal(iframe.src, iframe_src_value = /*selectedPdf*/ ctx[3])) {
    				attr_dev(iframe, "src", iframe_src_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div2);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$5.name,
    		type: "if",
    		source: "(125:4) {#if selectedPdf}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$6(ctx) {
    	let div3;
    	let div2;
    	let div1;
    	let div0;
    	let h2;
    	let t1;
    	let p;
    	let t3;
    	let button;
    	let t4;
    	let textarea;
    	let t5;
    	let t6;
    	let current;
    	let mounted;
    	let dispose;

    	function select_block_type(ctx, dirty) {
    		if (/*isRanking*/ ctx[2]) return create_if_block_2$1;
    		return create_else_block$3;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block0 = current_block_type(ctx);
    	let if_block1 = /*results*/ ctx[1].length > 0 && create_if_block_1$4(ctx);
    	let if_block2 = /*selectedPdf*/ ctx[3] && create_if_block$5(ctx);

    	const block = {
    		c: function create() {
    			div3 = element("div");
    			div2 = element("div");
    			div1 = element("div");
    			div0 = element("div");
    			h2 = element("h2");

    			h2.textContent = `${/*userRole*/ ctx[4] === 'recruiter'
			? 'AI Matching Engine'
			: 'AI Match Checker'}`;

    			t1 = space();
    			p = element("p");

    			p.textContent = `${/*userRole*/ ctx[4] === 'recruiter'
			? 'Paste your Job Description below to find the best candidates'
			: 'Paste a Job Description to see how well you match the role'}`;

    			t3 = space();
    			button = element("button");
    			if_block0.c();
    			t4 = space();
    			textarea = element("textarea");
    			t5 = space();
    			if (if_block1) if_block1.c();
    			t6 = space();
    			if (if_block2) if_block2.c();
    			attr_dev(h2, "class", "svelte-1pa3ltu");
    			add_location(h2, file$5, 69, 16, 2386);
    			attr_dev(p, "class", "svelte-1pa3ltu");
    			add_location(p, file$5, 70, 16, 2482);
    			attr_dev(div0, "class", "title-group svelte-1pa3ltu");
    			add_location(div0, file$5, 68, 12, 2344);
    			attr_dev(button, "class", "primary-btn svelte-1pa3ltu");
    			button.disabled = /*isRanking*/ ctx[2];
    			add_location(button, file$5, 72, 12, 2675);
    			attr_dev(div1, "class", "header-section svelte-1pa3ltu");
    			add_location(div1, file$5, 67, 8, 2303);
    			attr_dev(textarea, "placeholder", "Requirements: Python, Svelte, 3+ years experience...");
    			attr_dev(textarea, "rows", "10");
    			attr_dev(textarea, "class", "svelte-1pa3ltu");
    			add_location(textarea, file$5, 81, 8, 3029);
    			attr_dev(div2, "class", "rank-container glass svelte-1pa3ltu");
    			add_location(div2, file$5, 66, 4, 2260);
    			attr_dev(div3, "class", "rank-page svelte-1pa3ltu");
    			add_location(div3, file$5, 65, 0, 2232);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div3, anchor);
    			append_dev(div3, div2);
    			append_dev(div2, div1);
    			append_dev(div1, div0);
    			append_dev(div0, h2);
    			append_dev(div0, t1);
    			append_dev(div0, p);
    			append_dev(div1, t3);
    			append_dev(div1, button);
    			if_block0.m(button, null);
    			append_dev(div2, t4);
    			append_dev(div2, textarea);
    			set_input_value(textarea, /*jobDescription*/ ctx[0]);
    			append_dev(div3, t5);
    			if (if_block1) if_block1.m(div3, null);
    			append_dev(div3, t6);
    			if (if_block2) if_block2.m(div3, null);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(button, "click", /*rankResumes*/ ctx[5], false, false, false, false),
    					listen_dev(textarea, "input", /*textarea_input_handler*/ ctx[9])
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block0) {
    				if_block0.p(ctx, dirty);
    			} else {
    				if_block0.d(1);
    				if_block0 = current_block_type(ctx);

    				if (if_block0) {
    					if_block0.c();
    					if_block0.m(button, null);
    				}
    			}

    			if (!current || dirty & /*isRanking*/ 4) {
    				prop_dev(button, "disabled", /*isRanking*/ ctx[2]);
    			}

    			if (dirty & /*jobDescription*/ 1) {
    				set_input_value(textarea, /*jobDescription*/ ctx[0]);
    			}

    			if (/*results*/ ctx[1].length > 0) {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);

    					if (dirty & /*results*/ 2) {
    						transition_in(if_block1, 1);
    					}
    				} else {
    					if_block1 = create_if_block_1$4(ctx);
    					if_block1.c();
    					transition_in(if_block1, 1);
    					if_block1.m(div3, t6);
    				}
    			} else if (if_block1) {
    				group_outros();

    				transition_out(if_block1, 1, 1, () => {
    					if_block1 = null;
    				});

    				check_outros();
    			}

    			if (/*selectedPdf*/ ctx[3]) {
    				if (if_block2) {
    					if_block2.p(ctx, dirty);
    				} else {
    					if_block2 = create_if_block$5(ctx);
    					if_block2.c();
    					if_block2.m(div3, null);
    				}
    			} else if (if_block2) {
    				if_block2.d(1);
    				if_block2 = null;
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block1);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block1);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div3);
    			if_block0.d();
    			if (if_block1) if_block1.d();
    			if (if_block2) if_block2.d();
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$6.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$6($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Rank', slots, []);
    	let userRole = localStorage.getItem('role') || 'candidate';
    	let userName = localStorage.getItem('name') || 'User';
    	let jobDescription = '';
    	let results = [];
    	let isRanking = false;
    	let selectedPdf = null;

    	async function rankResumes() {
    		if (!jobDescription.trim()) {
    			notify("Please enter a job description", "info");
    			return;
    		}

    		$$invalidate(2, isRanking = true);

    		try {
    			const endpoint = userRole === 'recruiter'
    			? 'http://127.0.0.1:3000/api/resumes/rank'
    			: 'http://127.0.0.1:3000/api/resumes/rank'; // We use the same but filter in UI

    			const res = await fetch(endpoint, {
    				method: 'POST',
    				headers: { 'Content-Type': 'application/json' },
    				body: JSON.stringify({ job_description: jobDescription })
    			});

    			const result = await res.json();

    			if (result.success) {
    				if (userRole === 'recruiter') {
    					$$invalidate(1, results = result.data || []);
    				} else {
    					// CANDIDATE: Only show their OWN result
    					$$invalidate(1, results = (result.data || []).filter(r => r.name.toLowerCase().includes(userName.toLowerCase())));
    				}

    				notify(
    					userRole === 'recruiter'
    					? 'Ranking complete!'
    					: 'Analysis complete!',
    					'success'
    				);
    			} else {
    				notify(result.message, 'error');
    			}
    		} catch(err) {
    			console.error(err);
    			notify("Analysis failed", "error");
    		} finally {
    			$$invalidate(2, isRanking = false);
    		}
    	}

    	function viewPdf(filename) {
    		$$invalidate(3, selectedPdf = `http://127.0.0.1:3000/api/resumes/view/${filename}`);
    	}

    	function showReasoning(result) {
    		reasoningReport.set(result);
    		push('/dash/reasoning');
    	}

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console_1$1.warn(`<Rank> was created with unknown prop '${key}'`);
    	});

    	function click_handler(event) {
    		bubble.call(this, $$self, event);
    	}

    	function textarea_input_handler() {
    		jobDescription = this.value;
    		$$invalidate(0, jobDescription);
    	}

    	const click_handler_1 = result => viewPdf(result.filename);
    	const click_handler_2 = result => showReasoning(result);
    	const click_handler_3 = () => $$invalidate(3, selectedPdf = null);
    	const click_handler_4 = () => $$invalidate(3, selectedPdf = null);

    	$$self.$capture_state = () => ({
    		notify,
    		SkillTag,
    		fade,
    		fly,
    		push,
    		reasoningReport,
    		userRole,
    		userName,
    		jobDescription,
    		results,
    		isRanking,
    		selectedPdf,
    		rankResumes,
    		viewPdf,
    		showReasoning
    	});

    	$$self.$inject_state = $$props => {
    		if ('userRole' in $$props) $$invalidate(4, userRole = $$props.userRole);
    		if ('userName' in $$props) userName = $$props.userName;
    		if ('jobDescription' in $$props) $$invalidate(0, jobDescription = $$props.jobDescription);
    		if ('results' in $$props) $$invalidate(1, results = $$props.results);
    		if ('isRanking' in $$props) $$invalidate(2, isRanking = $$props.isRanking);
    		if ('selectedPdf' in $$props) $$invalidate(3, selectedPdf = $$props.selectedPdf);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		jobDescription,
    		results,
    		isRanking,
    		selectedPdf,
    		userRole,
    		rankResumes,
    		viewPdf,
    		showReasoning,
    		click_handler,
    		textarea_input_handler,
    		click_handler_1,
    		click_handler_2,
    		click_handler_3,
    		click_handler_4
    	];
    }

    class Rank extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$6, create_fragment$6, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Rank",
    			options,
    			id: create_fragment$6.name
    		});
    	}
    }

    /* src\pages\dash\Support.svelte generated by Svelte v3.59.2 */
    const file$4 = "src\\pages\\dash\\Support.svelte";

    function get_each_context$3(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[7] = list[i];
    	child_ctx[9] = i;
    	return child_ctx;
    }

    // (109:24) {#if faq.open}
    function create_if_block$4(ctx) {
    	let div;
    	let p;
    	let t_value = /*faq*/ ctx[7].a + "";
    	let t;
    	let div_transition;
    	let current;

    	const block = {
    		c: function create() {
    			div = element("div");
    			p = element("p");
    			t = text(t_value);
    			add_location(p, file$4, 110, 32, 4240);
    			attr_dev(div, "class", "faq-answer svelte-1r3twic");
    			add_location(div, file$4, 109, 28, 4166);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, p);
    			append_dev(p, t);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if ((!current || dirty & /*faqs*/ 2) && t_value !== (t_value = /*faq*/ ctx[7].a + "")) set_data_dev(t, t_value);
    		},
    		i: function intro(local) {
    			if (current) return;

    			add_render_callback(() => {
    				if (!current) return;
    				if (!div_transition) div_transition = create_bidirectional_transition(div, slide, {}, true);
    				div_transition.run(1);
    			});

    			current = true;
    		},
    		o: function outro(local) {
    			if (!div_transition) div_transition = create_bidirectional_transition(div, slide, {}, false);
    			div_transition.run(0);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if (detaching && div_transition) div_transition.end();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$4.name,
    		type: "if",
    		source: "(109:24) {#if faq.open}",
    		ctx
    	});

    	return block;
    }

    // (103:16) {#each faqs as faq, i}
    function create_each_block$3(ctx) {
    	let div;
    	let button;
    	let span0;
    	let t0_value = /*faq*/ ctx[7].q + "";
    	let t0;
    	let t1;
    	let span1;
    	let t2_value = (/*faq*/ ctx[7].open ? '−' : '+') + "";
    	let t2;
    	let t3;
    	let t4;
    	let current;
    	let mounted;
    	let dispose;

    	function click_handler() {
    		return /*click_handler*/ ctx[6](/*i*/ ctx[9]);
    	}

    	let if_block = /*faq*/ ctx[7].open && create_if_block$4(ctx);

    	const block = {
    		c: function create() {
    			div = element("div");
    			button = element("button");
    			span0 = element("span");
    			t0 = text(t0_value);
    			t1 = space();
    			span1 = element("span");
    			t2 = text(t2_value);
    			t3 = space();
    			if (if_block) if_block.c();
    			t4 = space();
    			add_location(span0, file$4, 105, 28, 3966);
    			attr_dev(span1, "class", "arrow");
    			add_location(span1, file$4, 106, 28, 4015);
    			attr_dev(button, "class", "faq-trigger svelte-1r3twic");
    			add_location(button, file$4, 104, 24, 3879);
    			attr_dev(div, "class", "faq-item svelte-1r3twic");
    			toggle_class(div, "active", /*faq*/ ctx[7].open);
    			add_location(div, file$4, 103, 20, 3808);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, button);
    			append_dev(button, span0);
    			append_dev(span0, t0);
    			append_dev(button, t1);
    			append_dev(button, span1);
    			append_dev(span1, t2);
    			append_dev(div, t3);
    			if (if_block) if_block.m(div, null);
    			append_dev(div, t4);
    			current = true;

    			if (!mounted) {
    				dispose = listen_dev(button, "click", click_handler, false, false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    			if ((!current || dirty & /*faqs*/ 2) && t0_value !== (t0_value = /*faq*/ ctx[7].q + "")) set_data_dev(t0, t0_value);
    			if ((!current || dirty & /*faqs*/ 2) && t2_value !== (t2_value = (/*faq*/ ctx[7].open ? '−' : '+') + "")) set_data_dev(t2, t2_value);

    			if (/*faq*/ ctx[7].open) {
    				if (if_block) {
    					if_block.p(ctx, dirty);

    					if (dirty & /*faqs*/ 2) {
    						transition_in(if_block, 1);
    					}
    				} else {
    					if_block = create_if_block$4(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(div, t4);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
    			}

    			if (!current || dirty & /*faqs*/ 2) {
    				toggle_class(div, "active", /*faq*/ ctx[7].open);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if (if_block) if_block.d();
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block$3.name,
    		type: "each",
    		source: "(103:16) {#each faqs as faq, i}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$5(ctx) {
    	let div16;
    	let div15;
    	let div9;
    	let div1;
    	let span0;
    	let t1;
    	let div0;
    	let h30;
    	let t3;
    	let p0;
    	let t5;
    	let form;
    	let div2;
    	let label0;
    	let t7;
    	let select;
    	let option0;
    	let option1;
    	let option2;
    	let option3;
    	let t12;
    	let div3;
    	let label1;
    	let t14;
    	let textarea;
    	let t15;
    	let button0;
    	let t17;
    	let div8;
    	let div5;
    	let span1;
    	let t19;
    	let div4;
    	let p1;
    	let t21;
    	let p2;
    	let t23;
    	let div7;
    	let span2;
    	let t25;
    	let div6;
    	let p3;
    	let t27;
    	let p4;
    	let t29;
    	let div14;
    	let div11;
    	let span3;
    	let t31;
    	let div10;
    	let h31;
    	let t33;
    	let p5;
    	let t35;
    	let div12;
    	let t36;
    	let div13;
    	let h4;
    	let t38;
    	let p6;
    	let t40;
    	let button1;
    	let div16_intro;
    	let current;
    	let mounted;
    	let dispose;
    	let each_value = /*faqs*/ ctx[1];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$3(get_each_context$3(ctx, each_value, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	const block = {
    		c: function create() {
    			div16 = element("div");
    			div15 = element("div");
    			div9 = element("div");
    			div1 = element("div");
    			span0 = element("span");
    			span0.textContent = "✉️";
    			t1 = space();
    			div0 = element("div");
    			h30 = element("h3");
    			h30.textContent = "Contact Support";
    			t3 = space();
    			p0 = element("p");
    			p0.textContent = "Have a specific issue? Send us a message.";
    			t5 = space();
    			form = element("form");
    			div2 = element("div");
    			label0 = element("label");
    			label0.textContent = "Inquiry Type";
    			t7 = space();
    			select = element("select");
    			option0 = element("option");
    			option0.textContent = "General Inquiry";
    			option1 = element("option");
    			option1.textContent = "Technical Issue";
    			option2 = element("option");
    			option2.textContent = "Billing Question";
    			option3 = element("option");
    			option3.textContent = "Feature Request";
    			t12 = space();
    			div3 = element("div");
    			label1 = element("label");
    			label1.textContent = "Message";
    			t14 = space();
    			textarea = element("textarea");
    			t15 = space();
    			button0 = element("button");
    			button0.textContent = "Send Message";
    			t17 = space();
    			div8 = element("div");
    			div5 = element("div");
    			span1 = element("span");
    			span1.textContent = "📞";
    			t19 = space();
    			div4 = element("div");
    			p1 = element("p");
    			p1.textContent = "Support Line";
    			t21 = space();
    			p2 = element("p");
    			p2.textContent = "+1 (555) 123-4567";
    			t23 = space();
    			div7 = element("div");
    			span2 = element("span");
    			span2.textContent = "🌐";
    			t25 = space();
    			div6 = element("div");
    			p3 = element("p");
    			p3.textContent = "Community";
    			t27 = space();
    			p4 = element("p");
    			p4.textContent = "Join our Discord";
    			t29 = space();
    			div14 = element("div");
    			div11 = element("div");
    			span3 = element("span");
    			span3.textContent = "❓";
    			t31 = space();
    			div10 = element("div");
    			h31 = element("h3");
    			h31.textContent = "Frequently Asked Questions";
    			t33 = space();
    			p5 = element("p");
    			p5.textContent = "Quick answers to common questions.";
    			t35 = space();
    			div12 = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t36 = space();
    			div13 = element("div");
    			h4 = element("h4");
    			h4.textContent = "Looking for documentation?";
    			t38 = space();
    			p6 = element("p");
    			p6.textContent = "Read our full API and implementation guides to get the most out of TalentScanAI.";
    			t40 = space();
    			button1 = element("button");
    			button1.textContent = "Read Docs";
    			attr_dev(span0, "class", "icon svelte-1r3twic");
    			add_location(span0, file$4, 47, 16, 1646);
    			attr_dev(h30, "class", "svelte-1r3twic");
    			add_location(h30, file$4, 49, 20, 1717);
    			attr_dev(p0, "class", "svelte-1r3twic");
    			add_location(p0, file$4, 50, 20, 1762);
    			add_location(div0, file$4, 48, 16, 1691);
    			attr_dev(div1, "class", "card-header svelte-1r3twic");
    			add_location(div1, file$4, 46, 12, 1604);
    			attr_dev(label0, "for", "subject");
    			attr_dev(label0, "class", "svelte-1r3twic");
    			add_location(label0, file$4, 56, 20, 1974);
    			option0.__value = "General Inquiry";
    			option0.value = option0.__value;
    			add_location(option0, file$4, 58, 24, 2115);
    			option1.__value = "Technical Issue";
    			option1.value = option1.__value;
    			add_location(option1, file$4, 59, 24, 2172);
    			option2.__value = "Billing Question";
    			option2.value = option2.__value;
    			add_location(option2, file$4, 60, 24, 2229);
    			option3.__value = "Feature Request";
    			option3.value = option3.__value;
    			add_location(option3, file$4, 61, 24, 2287);
    			attr_dev(select, "id", "subject");
    			attr_dev(select, "class", "svelte-1r3twic");
    			if (/*contactForm*/ ctx[0].subject === void 0) add_render_callback(() => /*select_change_handler*/ ctx[4].call(select));
    			add_location(select, file$4, 57, 20, 2036);
    			attr_dev(div2, "class", "form-group svelte-1r3twic");
    			add_location(div2, file$4, 55, 16, 1929);
    			attr_dev(label1, "for", "message");
    			attr_dev(label1, "class", "svelte-1r3twic");
    			add_location(label1, file$4, 66, 20, 2435);
    			attr_dev(textarea, "id", "message");
    			attr_dev(textarea, "placeholder", "Tell us what's on your mind...");
    			attr_dev(textarea, "class", "svelte-1r3twic");
    			add_location(textarea, file$4, 67, 20, 2492);
    			attr_dev(div3, "class", "form-group svelte-1r3twic");
    			add_location(div3, file$4, 65, 16, 2390);
    			attr_dev(button0, "type", "submit");
    			attr_dev(button0, "class", "primary-btn svelte-1r3twic");
    			add_location(button0, file$4, 70, 16, 2645);
    			add_location(form, file$4, 54, 12, 1866);
    			attr_dev(span1, "class", "l-icon svelte-1r3twic");
    			add_location(span1, file$4, 75, 20, 2828);
    			attr_dev(p1, "class", "l-label svelte-1r3twic");
    			add_location(p1, file$4, 77, 24, 2909);
    			attr_dev(p2, "class", "l-val svelte-1r3twic");
    			add_location(p2, file$4, 78, 24, 2969);
    			add_location(div4, file$4, 76, 20, 2879);
    			attr_dev(div5, "class", "link-item svelte-1r3twic");
    			add_location(div5, file$4, 74, 16, 2784);
    			attr_dev(span2, "class", "l-icon svelte-1r3twic");
    			add_location(span2, file$4, 82, 20, 3118);
    			attr_dev(p3, "class", "l-label svelte-1r3twic");
    			add_location(p3, file$4, 84, 24, 3199);
    			attr_dev(p4, "class", "l-val svelte-1r3twic");
    			add_location(p4, file$4, 85, 24, 3256);
    			add_location(div6, file$4, 83, 20, 3169);
    			attr_dev(div7, "class", "link-item svelte-1r3twic");
    			add_location(div7, file$4, 81, 16, 3074);
    			attr_dev(div8, "class", "quick-links svelte-1r3twic");
    			add_location(div8, file$4, 73, 12, 2742);
    			attr_dev(div9, "class", "support-card glass svelte-1r3twic");
    			add_location(div9, file$4, 45, 8, 1559);
    			attr_dev(span3, "class", "icon svelte-1r3twic");
    			add_location(span3, file$4, 94, 16, 3503);
    			attr_dev(h31, "class", "svelte-1r3twic");
    			add_location(h31, file$4, 96, 20, 3573);
    			attr_dev(p5, "class", "svelte-1r3twic");
    			add_location(p5, file$4, 97, 20, 3629);
    			add_location(div10, file$4, 95, 16, 3547);
    			attr_dev(div11, "class", "card-header svelte-1r3twic");
    			add_location(div11, file$4, 93, 12, 3461);
    			attr_dev(div12, "class", "faq-list svelte-1r3twic");
    			add_location(div12, file$4, 101, 12, 3726);
    			attr_dev(h4, "class", "svelte-1r3twic");
    			add_location(h4, file$4, 118, 16, 4442);
    			attr_dev(p6, "class", "svelte-1r3twic");
    			add_location(p6, file$4, 119, 16, 4494);
    			attr_dev(button1, "class", "outline-btn svelte-1r3twic");
    			add_location(button1, file$4, 120, 16, 4598);
    			attr_dev(div13, "class", "doc-card svelte-1r3twic");
    			add_location(div13, file$4, 117, 12, 4403);
    			attr_dev(div14, "class", "support-card glass svelte-1r3twic");
    			add_location(div14, file$4, 92, 8, 3416);
    			attr_dev(div15, "class", "support-grid svelte-1r3twic");
    			add_location(div15, file$4, 43, 4, 1491);
    			attr_dev(div16, "class", "support-page svelte-1r3twic");
    			add_location(div16, file$4, 42, 0, 1452);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div16, anchor);
    			append_dev(div16, div15);
    			append_dev(div15, div9);
    			append_dev(div9, div1);
    			append_dev(div1, span0);
    			append_dev(div1, t1);
    			append_dev(div1, div0);
    			append_dev(div0, h30);
    			append_dev(div0, t3);
    			append_dev(div0, p0);
    			append_dev(div9, t5);
    			append_dev(div9, form);
    			append_dev(form, div2);
    			append_dev(div2, label0);
    			append_dev(div2, t7);
    			append_dev(div2, select);
    			append_dev(select, option0);
    			append_dev(select, option1);
    			append_dev(select, option2);
    			append_dev(select, option3);
    			select_option(select, /*contactForm*/ ctx[0].subject, true);
    			append_dev(form, t12);
    			append_dev(form, div3);
    			append_dev(div3, label1);
    			append_dev(div3, t14);
    			append_dev(div3, textarea);
    			set_input_value(textarea, /*contactForm*/ ctx[0].message);
    			append_dev(form, t15);
    			append_dev(form, button0);
    			append_dev(div9, t17);
    			append_dev(div9, div8);
    			append_dev(div8, div5);
    			append_dev(div5, span1);
    			append_dev(div5, t19);
    			append_dev(div5, div4);
    			append_dev(div4, p1);
    			append_dev(div4, t21);
    			append_dev(div4, p2);
    			append_dev(div8, t23);
    			append_dev(div8, div7);
    			append_dev(div7, span2);
    			append_dev(div7, t25);
    			append_dev(div7, div6);
    			append_dev(div6, p3);
    			append_dev(div6, t27);
    			append_dev(div6, p4);
    			append_dev(div15, t29);
    			append_dev(div15, div14);
    			append_dev(div14, div11);
    			append_dev(div11, span3);
    			append_dev(div11, t31);
    			append_dev(div11, div10);
    			append_dev(div10, h31);
    			append_dev(div10, t33);
    			append_dev(div10, p5);
    			append_dev(div14, t35);
    			append_dev(div14, div12);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				if (each_blocks[i]) {
    					each_blocks[i].m(div12, null);
    				}
    			}

    			append_dev(div14, t36);
    			append_dev(div14, div13);
    			append_dev(div13, h4);
    			append_dev(div13, t38);
    			append_dev(div13, p6);
    			append_dev(div13, t40);
    			append_dev(div13, button1);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(select, "change", /*select_change_handler*/ ctx[4]),
    					listen_dev(textarea, "input", /*textarea_input_handler*/ ctx[5]),
    					listen_dev(form, "submit", prevent_default(/*handleSubmit*/ ctx[3]), false, true, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*contactForm*/ 1) {
    				select_option(select, /*contactForm*/ ctx[0].subject);
    			}

    			if (dirty & /*contactForm*/ 1) {
    				set_input_value(textarea, /*contactForm*/ ctx[0].message);
    			}

    			if (dirty & /*faqs, toggleFaq*/ 6) {
    				each_value = /*faqs*/ ctx[1];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$3(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block$3(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(div12, null);
    					}
    				}

    				group_outros();

    				for (i = each_value.length; i < each_blocks.length; i += 1) {
    					out(i);
    				}

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;

    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			if (!div16_intro) {
    				add_render_callback(() => {
    					div16_intro = create_in_transition(div16, fade, {});
    					div16_intro.start();
    				});
    			}

    			current = true;
    		},
    		o: function outro(local) {
    			each_blocks = each_blocks.filter(Boolean);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div16);
    			destroy_each(each_blocks, detaching);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$5.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$5($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Support', slots, []);
    	let contactForm = { subject: 'General Inquiry', message: '' };

    	let faqs = [
    		{
    			q: "How does the AI Match Score work?",
    			a: "Our engine uses NLP (Natural Language Processing) and Cosine Similarity to compare your Job Description against candidate resumes. It specifically weights technical skills and experience levels for higher accuracy.",
    			open: false
    		},
    		{
    			q: "Can I upload multiple resumes at once?",
    			a: "Yes! You can drag and drop multiple PDF files into the 'Manage Resumes' section to process your entire candidate pool in seconds.",
    			open: false
    		},
    		{
    			q: "What file formats are supported?",
    			a: "Currently, we support PDF files as they are the industry standard for professional resumes. Support for DOCX is coming soon.",
    			open: false
    		}
    	];

    	function toggleFaq(index) {
    		$$invalidate(1, faqs[index].open = !faqs[index].open, faqs);
    		$$invalidate(1, faqs);
    	}

    	function handleSubmit() {
    		if (!contactForm.message) {
    			notify("Please enter a message", "info");
    			return;
    		}

    		notify("Support ticket created! We'll get back to you shortly.", "success");
    		$$invalidate(0, contactForm.message = '', contactForm);
    	}

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Support> was created with unknown prop '${key}'`);
    	});

    	function select_change_handler() {
    		contactForm.subject = select_value(this);
    		$$invalidate(0, contactForm);
    	}

    	function textarea_input_handler() {
    		contactForm.message = this.value;
    		$$invalidate(0, contactForm);
    	}

    	const click_handler = i => toggleFaq(i);

    	$$self.$capture_state = () => ({
    		notify,
    		fade,
    		slide,
    		contactForm,
    		faqs,
    		toggleFaq,
    		handleSubmit
    	});

    	$$self.$inject_state = $$props => {
    		if ('contactForm' in $$props) $$invalidate(0, contactForm = $$props.contactForm);
    		if ('faqs' in $$props) $$invalidate(1, faqs = $$props.faqs);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		contactForm,
    		faqs,
    		toggleFaq,
    		handleSubmit,
    		select_change_handler,
    		textarea_input_handler,
    		click_handler
    	];
    }

    class Support extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$5, create_fragment$5, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Support",
    			options,
    			id: create_fragment$5.name
    		});
    	}
    }

    /* src\pages\dash\Stats.svelte generated by Svelte v3.59.2 */

    const { console: console_1 } = globals;
    const file$3 = "src\\pages\\dash\\Stats.svelte";

    function get_each_context$2(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[2] = list[i];
    	return child_ctx;
    }

    function get_each_context_1$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[5] = list[i].skill;
    	child_ctx[6] = list[i].count;
    	return child_ctx;
    }

    // (49:16) {#each stats.top_skills as {skill, count}}
    function create_each_block_1$1(ctx) {
    	let div2;
    	let span0;
    	let t0_value = /*skill*/ ctx[5] + "";
    	let t0;
    	let t1;
    	let div1;
    	let div0;
    	let t2;
    	let span1;
    	let t3_value = /*count*/ ctx[6] + "";
    	let t3;

    	const block = {
    		c: function create() {
    			div2 = element("div");
    			span0 = element("span");
    			t0 = text(t0_value);
    			t1 = space();
    			div1 = element("div");
    			div0 = element("div");
    			t2 = space();
    			span1 = element("span");
    			t3 = text(t3_value);
    			attr_dev(span0, "class", "label svelte-1sykp32");
    			add_location(span0, file$3, 50, 24, 1766);
    			attr_dev(div0, "class", "bar svelte-1sykp32");
    			set_style(div0, "width", /*count*/ ctx[6] / /*stats*/ ctx[0].total_resumes * 100 + "%");
    			add_location(div0, file$3, 52, 28, 1879);
    			attr_dev(span1, "class", "count svelte-1sykp32");
    			add_location(span1, file$3, 53, 28, 1985);
    			attr_dev(div1, "class", "bar-wrapper svelte-1sykp32");
    			add_location(div1, file$3, 51, 24, 1825);
    			attr_dev(div2, "class", "bar-row svelte-1sykp32");
    			add_location(div2, file$3, 49, 20, 1720);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div2, anchor);
    			append_dev(div2, span0);
    			append_dev(span0, t0);
    			append_dev(div2, t1);
    			append_dev(div2, div1);
    			append_dev(div1, div0);
    			append_dev(div1, t2);
    			append_dev(div1, span1);
    			append_dev(span1, t3);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*stats*/ 1 && t0_value !== (t0_value = /*skill*/ ctx[5] + "")) set_data_dev(t0, t0_value);

    			if (dirty & /*stats*/ 1) {
    				set_style(div0, "width", /*count*/ ctx[6] / /*stats*/ ctx[0].total_resumes * 100 + "%");
    			}

    			if (dirty & /*stats*/ 1 && t3_value !== (t3_value = /*count*/ ctx[6] + "")) set_data_dev(t3, t3_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div2);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_1$1.name,
    		type: "each",
    		source: "(49:16) {#each stats.top_skills as {skill, count}}",
    		ctx
    	});

    	return block;
    }

    // (58:16) {#if stats.top_skills.length === 0}
    function create_if_block_1$3(ctx) {
    	let p;

    	const block = {
    		c: function create() {
    			p = element("p");
    			p.textContent = "No skill data available yet.";
    			attr_dev(p, "class", "empty svelte-1sykp32");
    			add_location(p, file$3, 58, 20, 2174);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1$3.name,
    		type: "if",
    		source: "(58:16) {#if stats.top_skills.length === 0}",
    		ctx
    	});

    	return block;
    }

    // (67:16) {#each stats.recent_activity as activity}
    function create_each_block$2(ctx) {
    	let div2;
    	let div0;
    	let t0;
    	let div1;
    	let p0;
    	let t1_value = /*activity*/ ctx[2].name + "";
    	let t1;
    	let t2;
    	let p1;
    	let t3_value = /*activity*/ ctx[2].date + "";
    	let t3;
    	let t4;
    	let span;
    	let div2_intro;

    	const block = {
    		c: function create() {
    			div2 = element("div");
    			div0 = element("div");
    			t0 = space();
    			div1 = element("div");
    			p0 = element("p");
    			t1 = text(t1_value);
    			t2 = space();
    			p1 = element("p");
    			t3 = text(t3_value);
    			t4 = space();
    			span = element("span");
    			span.textContent = "Processed";
    			attr_dev(div0, "class", "dot svelte-1sykp32");
    			add_location(div0, file$3, 68, 24, 2573);
    			attr_dev(p0, "class", "activity-name svelte-1sykp32");
    			add_location(p0, file$3, 70, 28, 2677);
    			attr_dev(p1, "class", "activity-date svelte-1sykp32");
    			add_location(p1, file$3, 71, 28, 2750);
    			attr_dev(div1, "class", "activity-info svelte-1sykp32");
    			add_location(div1, file$3, 69, 24, 2621);
    			attr_dev(span, "class", "status-tag svelte-1sykp32");
    			add_location(span, file$3, 73, 24, 2850);
    			attr_dev(div2, "class", "activity-item svelte-1sykp32");
    			add_location(div2, file$3, 67, 20, 2487);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div2, anchor);
    			append_dev(div2, div0);
    			append_dev(div2, t0);
    			append_dev(div2, div1);
    			append_dev(div1, p0);
    			append_dev(p0, t1);
    			append_dev(div1, t2);
    			append_dev(div1, p1);
    			append_dev(p1, t3);
    			append_dev(div2, t4);
    			append_dev(div2, span);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*stats*/ 1 && t1_value !== (t1_value = /*activity*/ ctx[2].name + "")) set_data_dev(t1, t1_value);
    			if (dirty & /*stats*/ 1 && t3_value !== (t3_value = /*activity*/ ctx[2].date + "")) set_data_dev(t3, t3_value);
    		},
    		i: function intro(local) {
    			if (!div2_intro) {
    				add_render_callback(() => {
    					div2_intro = create_in_transition(div2, fly, { x: 20, duration: 400 });
    					div2_intro.start();
    				});
    			}
    		},
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div2);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block$2.name,
    		type: "each",
    		source: "(67:16) {#each stats.recent_activity as activity}",
    		ctx
    	});

    	return block;
    }

    // (77:16) {#if stats.recent_activity.length === 0}
    function create_if_block$3(ctx) {
    	let p;

    	const block = {
    		c: function create() {
    			p = element("p");
    			p.textContent = "No recent activity.";
    			attr_dev(p, "class", "empty svelte-1sykp32");
    			add_location(p, file$3, 77, 20, 3020);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$3.name,
    		type: "if",
    		source: "(77:16) {#if stats.recent_activity.length === 0}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$4(ctx) {
    	let div6;
    	let div0;
    	let statscard0;
    	let t0;
    	let statscard1;
    	let t1;
    	let statscard2;
    	let t2;
    	let statscard3;
    	let t3;
    	let div5;
    	let div2;
    	let h30;
    	let t5;
    	let div1;
    	let t6;
    	let t7;
    	let div4;
    	let h31;
    	let t9;
    	let div3;
    	let t10;
    	let current;

    	statscard0 = new StatsCard({
    			props: {
    				title: "Database Size",
    				value: /*stats*/ ctx[0].total_resumes,
    				icon: "📁",
    				color: "#4f46e5"
    			},
    			$$inline: true
    		});

    	statscard1 = new StatsCard({
    			props: {
    				title: "Unique Skills",
    				value: /*stats*/ ctx[0].total_skills_found,
    				icon: "⚡",
    				color: "#10b981"
    			},
    			$$inline: true
    		});

    	statscard2 = new StatsCard({
    			props: {
    				title: "Active Jobs",
    				value: "3",
    				icon: "💼",
    				color: "#f59e0b"
    			},
    			$$inline: true
    		});

    	statscard3 = new StatsCard({
    			props: {
    				title: "Avg Match",
    				value: "72%",
    				icon: "📈",
    				color: "#8b5cf6"
    			},
    			$$inline: true
    		});

    	let each_value_1 = /*stats*/ ctx[0].top_skills;
    	validate_each_argument(each_value_1);
    	let each_blocks_1 = [];

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		each_blocks_1[i] = create_each_block_1$1(get_each_context_1$1(ctx, each_value_1, i));
    	}

    	let if_block0 = /*stats*/ ctx[0].top_skills.length === 0 && create_if_block_1$3(ctx);
    	let each_value = /*stats*/ ctx[0].recent_activity;
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$2(get_each_context$2(ctx, each_value, i));
    	}

    	let if_block1 = /*stats*/ ctx[0].recent_activity.length === 0 && create_if_block$3(ctx);

    	const block = {
    		c: function create() {
    			div6 = element("div");
    			div0 = element("div");
    			create_component(statscard0.$$.fragment);
    			t0 = space();
    			create_component(statscard1.$$.fragment);
    			t1 = space();
    			create_component(statscard2.$$.fragment);
    			t2 = space();
    			create_component(statscard3.$$.fragment);
    			t3 = space();
    			div5 = element("div");
    			div2 = element("div");
    			h30 = element("h3");
    			h30.textContent = "Top Detected Skills";
    			t5 = space();
    			div1 = element("div");

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].c();
    			}

    			t6 = space();
    			if (if_block0) if_block0.c();
    			t7 = space();
    			div4 = element("div");
    			h31 = element("h3");
    			h31.textContent = "Recent Upload Activity";
    			t9 = space();
    			div3 = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t10 = space();
    			if (if_block1) if_block1.c();
    			attr_dev(div0, "class", "stats-grid svelte-1sykp32");
    			add_location(div0, file$3, 37, 4, 1094);
    			attr_dev(h30, "class", "svelte-1sykp32");
    			add_location(h30, file$3, 46, 12, 1576);
    			attr_dev(div1, "class", "bar-chart svelte-1sykp32");
    			add_location(div1, file$3, 47, 12, 1617);
    			attr_dev(div2, "class", "chart-container glass svelte-1sykp32");
    			add_location(div2, file$3, 45, 8, 1528);
    			attr_dev(h31, "class", "svelte-1sykp32");
    			add_location(h31, file$3, 64, 12, 2337);
    			attr_dev(div3, "class", "activity-list svelte-1sykp32");
    			add_location(div3, file$3, 65, 12, 2381);
    			attr_dev(div4, "class", "chart-container glass svelte-1sykp32");
    			add_location(div4, file$3, 63, 8, 2289);
    			attr_dev(div5, "class", "charts-section svelte-1sykp32");
    			add_location(div5, file$3, 44, 4, 1491);
    			attr_dev(div6, "class", "stats-page svelte-1sykp32");
    			add_location(div6, file$3, 36, 0, 1065);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div6, anchor);
    			append_dev(div6, div0);
    			mount_component(statscard0, div0, null);
    			append_dev(div0, t0);
    			mount_component(statscard1, div0, null);
    			append_dev(div0, t1);
    			mount_component(statscard2, div0, null);
    			append_dev(div0, t2);
    			mount_component(statscard3, div0, null);
    			append_dev(div6, t3);
    			append_dev(div6, div5);
    			append_dev(div5, div2);
    			append_dev(div2, h30);
    			append_dev(div2, t5);
    			append_dev(div2, div1);

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				if (each_blocks_1[i]) {
    					each_blocks_1[i].m(div1, null);
    				}
    			}

    			append_dev(div1, t6);
    			if (if_block0) if_block0.m(div1, null);
    			append_dev(div5, t7);
    			append_dev(div5, div4);
    			append_dev(div4, h31);
    			append_dev(div4, t9);
    			append_dev(div4, div3);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				if (each_blocks[i]) {
    					each_blocks[i].m(div3, null);
    				}
    			}

    			append_dev(div3, t10);
    			if (if_block1) if_block1.m(div3, null);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			const statscard0_changes = {};
    			if (dirty & /*stats*/ 1) statscard0_changes.value = /*stats*/ ctx[0].total_resumes;
    			statscard0.$set(statscard0_changes);
    			const statscard1_changes = {};
    			if (dirty & /*stats*/ 1) statscard1_changes.value = /*stats*/ ctx[0].total_skills_found;
    			statscard1.$set(statscard1_changes);

    			if (dirty & /*stats*/ 1) {
    				each_value_1 = /*stats*/ ctx[0].top_skills;
    				validate_each_argument(each_value_1);
    				let i;

    				for (i = 0; i < each_value_1.length; i += 1) {
    					const child_ctx = get_each_context_1$1(ctx, each_value_1, i);

    					if (each_blocks_1[i]) {
    						each_blocks_1[i].p(child_ctx, dirty);
    					} else {
    						each_blocks_1[i] = create_each_block_1$1(child_ctx);
    						each_blocks_1[i].c();
    						each_blocks_1[i].m(div1, t6);
    					}
    				}

    				for (; i < each_blocks_1.length; i += 1) {
    					each_blocks_1[i].d(1);
    				}

    				each_blocks_1.length = each_value_1.length;
    			}

    			if (/*stats*/ ctx[0].top_skills.length === 0) {
    				if (if_block0) ; else {
    					if_block0 = create_if_block_1$3(ctx);
    					if_block0.c();
    					if_block0.m(div1, null);
    				}
    			} else if (if_block0) {
    				if_block0.d(1);
    				if_block0 = null;
    			}

    			if (dirty & /*stats*/ 1) {
    				each_value = /*stats*/ ctx[0].recent_activity;
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$2(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block$2(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(div3, t10);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}

    			if (/*stats*/ ctx[0].recent_activity.length === 0) {
    				if (if_block1) ; else {
    					if_block1 = create_if_block$3(ctx);
    					if_block1.c();
    					if_block1.m(div3, null);
    				}
    			} else if (if_block1) {
    				if_block1.d(1);
    				if_block1 = null;
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(statscard0.$$.fragment, local);
    			transition_in(statscard1.$$.fragment, local);
    			transition_in(statscard2.$$.fragment, local);
    			transition_in(statscard3.$$.fragment, local);

    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(statscard0.$$.fragment, local);
    			transition_out(statscard1.$$.fragment, local);
    			transition_out(statscard2.$$.fragment, local);
    			transition_out(statscard3.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div6);
    			destroy_component(statscard0);
    			destroy_component(statscard1);
    			destroy_component(statscard2);
    			destroy_component(statscard3);
    			destroy_each(each_blocks_1, detaching);
    			if (if_block0) if_block0.d();
    			destroy_each(each_blocks, detaching);
    			if (if_block1) if_block1.d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$4.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$4($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Stats', slots, []);
    	let userRole = localStorage.getItem('role') || 'candidate';

    	let stats = {
    		total_resumes: 0,
    		top_skills: [],
    		recent_activity: [],
    		total_skills_found: 0
    	};

    	onMount(async () => {
    		if (userRole !== 'recruiter') {
    			notify("Access Denied: Analytics are for recruiters only", "error");
    			push('/dash/manage');
    			return;
    		}

    		try {
    			const res = await fetch('http://127.0.0.1:3000/api/stats');
    			const result = await res.json();

    			if (result.success) {
    				$$invalidate(0, stats = result.data);
    			}
    		} catch(err) {
    			console.error('Failed to fetch stats:', err);
    			notify("Error loading analytics data", "error");
    		}
    	});

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console_1.warn(`<Stats> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({
    		onMount,
    		push,
    		notify,
    		StatsCard,
    		fade,
    		fly,
    		userRole,
    		stats
    	});

    	$$self.$inject_state = $$props => {
    		if ('userRole' in $$props) userRole = $$props.userRole;
    		if ('stats' in $$props) $$invalidate(0, stats = $$props.stats);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [stats];
    }

    class Stats extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$4, create_fragment$4, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Stats",
    			options,
    			id: create_fragment$4.name
    		});
    	}
    }

    /* src\pages\dash\Reasoning.svelte generated by Svelte v3.59.2 */
    const file$2 = "src\\pages\\dash\\Reasoning.svelte";

    function get_each_context$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[2] = list[i];
    	return child_ctx;
    }

    function get_each_context_1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[5] = list[i];
    	return child_ctx;
    }

    function get_each_context_2(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[5] = list[i];
    	return child_ctx;
    }

    // (28:4) {#if report}
    function create_if_block$2(ctx) {
    	let div9;
    	let div3;
    	let div2;
    	let div0;
    	let svg;
    	let path0;
    	let path1;
    	let path1_stroke_dasharray_value;
    	let text_1;
    	let t0_value = /*report*/ ctx[0].score + "";
    	let t0;
    	let t1;
    	let t2;
    	let div1;
    	let h2;
    	let t3_value = /*report*/ ctx[0].name + "";
    	let t3;
    	let t4;
    	let p0;
    	let t5_value = /*report*/ ctx[0].summary + "";
    	let t5;
    	let t6;
    	let div5;
    	let h30;
    	let t8;
    	let p1;
    	let t10;
    	let div4;
    	let t11;
    	let div5_intro;
    	let t12;
    	let div7;
    	let h31;
    	let t14;
    	let p2;
    	let t16;
    	let div6;
    	let t17;
    	let div7_intro;
    	let t18;
    	let div8;
    	let h32;
    	let t20;
    	let p3;
    	let t22;
    	let ul;
    	let t23;
    	let li;
    	let div8_intro;
    	let current;
    	let each_value_2 = /*report*/ ctx[0].matched_skills;
    	validate_each_argument(each_value_2);
    	let each_blocks_2 = [];

    	for (let i = 0; i < each_value_2.length; i += 1) {
    		each_blocks_2[i] = create_each_block_2(get_each_context_2(ctx, each_value_2, i));
    	}

    	const out = i => transition_out(each_blocks_2[i], 1, 1, () => {
    		each_blocks_2[i] = null;
    	});

    	let if_block0 = /*report*/ ctx[0].matched_skills.length === 0 && create_if_block_3(ctx);
    	let each_value_1 = /*report*/ ctx[0].missing_skills;
    	validate_each_argument(each_value_1);
    	let each_blocks_1 = [];

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		each_blocks_1[i] = create_each_block_1(get_each_context_1(ctx, each_value_1, i));
    	}

    	let if_block1 = /*report*/ ctx[0].missing_skills.length === 0 && create_if_block_1$2(ctx);
    	let each_value = /*report*/ ctx[0].recommendations;
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$1(get_each_context$1(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			div9 = element("div");
    			div3 = element("div");
    			div2 = element("div");
    			div0 = element("div");
    			svg = svg_element("svg");
    			path0 = svg_element("path");
    			path1 = svg_element("path");
    			text_1 = svg_element("text");
    			t0 = text(t0_value);
    			t1 = text("%");
    			t2 = space();
    			div1 = element("div");
    			h2 = element("h2");
    			t3 = text(t3_value);
    			t4 = space();
    			p0 = element("p");
    			t5 = text(t5_value);
    			t6 = space();
    			div5 = element("div");
    			h30 = element("h3");
    			h30.textContent = "✅ Matched Keywords";
    			t8 = space();
    			p1 = element("p");
    			p1.textContent = "These skills were found in both the JD and the resume.";
    			t10 = space();
    			div4 = element("div");

    			for (let i = 0; i < each_blocks_2.length; i += 1) {
    				each_blocks_2[i].c();
    			}

    			t11 = space();
    			if (if_block0) if_block0.c();
    			t12 = space();
    			div7 = element("div");
    			h31 = element("h3");
    			h31.textContent = "❌ Missing Qualifications";
    			t14 = space();
    			p2 = element("p");
    			p2.textContent = "The Job Description required these, but they weren't found.";
    			t16 = space();
    			div6 = element("div");

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].c();
    			}

    			t17 = space();
    			if (if_block1) if_block1.c();
    			t18 = space();
    			div8 = element("div");
    			h32 = element("h3");
    			h32.textContent = "💡 Strategic Recommendations";
    			t20 = space();
    			p3 = element("p");
    			p3.textContent = "AI-generated tips to improve this candidate's match.";
    			t22 = space();
    			ul = element("ul");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t23 = space();
    			li = element("li");
    			li.textContent = "Suggest the candidate updates their resume with concrete project examples for missing tools.";
    			attr_dev(path0, "class", "circle-bg svelte-1o2wtdi");
    			attr_dev(path0, "d", "M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831");
    			add_location(path0, file$2, 34, 28, 1072);
    			attr_dev(path1, "class", "circle svelte-1o2wtdi");
    			attr_dev(path1, "stroke-dasharray", path1_stroke_dasharray_value = "" + (/*report*/ ctx[0].score + ", 100}"));
    			attr_dev(path1, "d", "M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831");
    			add_location(path1, file$2, 35, 28, 1209);
    			attr_dev(text_1, "x", "18");
    			attr_dev(text_1, "y", "20.35");
    			attr_dev(text_1, "class", "percentage svelte-1o2wtdi");
    			add_location(text_1, file$2, 36, 28, 1383);
    			attr_dev(svg, "viewBox", "0 0 36 36");
    			attr_dev(svg, "class", "circular-chart svelte-1o2wtdi");
    			add_location(svg, file$2, 33, 24, 995);
    			attr_dev(div0, "class", "score-circle svelte-1o2wtdi");
    			add_location(div0, file$2, 32, 20, 944);
    			attr_dev(h2, "class", "svelte-1o2wtdi");
    			add_location(h2, file$2, 40, 24, 1575);
    			attr_dev(p0, "class", "summary-text svelte-1o2wtdi");
    			add_location(p0, file$2, 41, 24, 1622);
    			attr_dev(div1, "class", "title-info svelte-1o2wtdi");
    			add_location(div1, file$2, 39, 20, 1526);
    			attr_dev(div2, "class", "card-header svelte-1o2wtdi");
    			add_location(div2, file$2, 31, 16, 898);
    			attr_dev(div3, "class", "report-card glass highlight svelte-1o2wtdi");
    			add_location(div3, file$2, 30, 12, 840);
    			add_location(h30, file$2, 48, 16, 1864);
    			attr_dev(p1, "class", "desc svelte-1o2wtdi");
    			add_location(p1, file$2, 49, 16, 1908);
    			attr_dev(div4, "class", "skills-list svelte-1o2wtdi");
    			add_location(div4, file$2, 50, 16, 1999);
    			attr_dev(div5, "class", "report-card glass svelte-1o2wtdi");
    			add_location(div5, file$2, 47, 12, 1785);
    			add_location(h31, file$2, 62, 16, 2499);
    			attr_dev(p2, "class", "desc svelte-1o2wtdi");
    			add_location(p2, file$2, 63, 16, 2549);
    			attr_dev(div6, "class", "skills-list svelte-1o2wtdi");
    			add_location(div6, file$2, 64, 16, 2645);
    			attr_dev(div7, "class", "report-card glass danger svelte-1o2wtdi");
    			add_location(div7, file$2, 61, 12, 2413);
    			add_location(h32, file$2, 81, 16, 3500);
    			attr_dev(p3, "class", "desc svelte-1o2wtdi");
    			add_location(p3, file$2, 82, 16, 3554);
    			attr_dev(li, "class", "svelte-1o2wtdi");
    			add_location(li, file$2, 87, 20, 3813);
    			attr_dev(ul, "class", "advice-list svelte-1o2wtdi");
    			add_location(ul, file$2, 83, 16, 3643);
    			attr_dev(div8, "class", "report-card glass advice svelte-1o2wtdi");
    			add_location(div8, file$2, 80, 12, 3414);
    			attr_dev(div9, "class", "report-grid svelte-1o2wtdi");
    			add_location(div9, file$2, 28, 8, 768);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div9, anchor);
    			append_dev(div9, div3);
    			append_dev(div3, div2);
    			append_dev(div2, div0);
    			append_dev(div0, svg);
    			append_dev(svg, path0);
    			append_dev(svg, path1);
    			append_dev(svg, text_1);
    			append_dev(text_1, t0);
    			append_dev(text_1, t1);
    			append_dev(div2, t2);
    			append_dev(div2, div1);
    			append_dev(div1, h2);
    			append_dev(h2, t3);
    			append_dev(div1, t4);
    			append_dev(div1, p0);
    			append_dev(p0, t5);
    			append_dev(div9, t6);
    			append_dev(div9, div5);
    			append_dev(div5, h30);
    			append_dev(div5, t8);
    			append_dev(div5, p1);
    			append_dev(div5, t10);
    			append_dev(div5, div4);

    			for (let i = 0; i < each_blocks_2.length; i += 1) {
    				if (each_blocks_2[i]) {
    					each_blocks_2[i].m(div4, null);
    				}
    			}

    			append_dev(div4, t11);
    			if (if_block0) if_block0.m(div4, null);
    			append_dev(div9, t12);
    			append_dev(div9, div7);
    			append_dev(div7, h31);
    			append_dev(div7, t14);
    			append_dev(div7, p2);
    			append_dev(div7, t16);
    			append_dev(div7, div6);

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				if (each_blocks_1[i]) {
    					each_blocks_1[i].m(div6, null);
    				}
    			}

    			append_dev(div6, t17);
    			if (if_block1) if_block1.m(div6, null);
    			append_dev(div9, t18);
    			append_dev(div9, div8);
    			append_dev(div8, h32);
    			append_dev(div8, t20);
    			append_dev(div8, p3);
    			append_dev(div8, t22);
    			append_dev(div8, ul);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				if (each_blocks[i]) {
    					each_blocks[i].m(ul, null);
    				}
    			}

    			append_dev(ul, t23);
    			append_dev(ul, li);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (!current || dirty & /*report*/ 1 && path1_stroke_dasharray_value !== (path1_stroke_dasharray_value = "" + (/*report*/ ctx[0].score + ", 100}"))) {
    				attr_dev(path1, "stroke-dasharray", path1_stroke_dasharray_value);
    			}

    			if ((!current || dirty & /*report*/ 1) && t0_value !== (t0_value = /*report*/ ctx[0].score + "")) set_data_dev(t0, t0_value);
    			if ((!current || dirty & /*report*/ 1) && t3_value !== (t3_value = /*report*/ ctx[0].name + "")) set_data_dev(t3, t3_value);
    			if ((!current || dirty & /*report*/ 1) && t5_value !== (t5_value = /*report*/ ctx[0].summary + "")) set_data_dev(t5, t5_value);

    			if (dirty & /*report*/ 1) {
    				each_value_2 = /*report*/ ctx[0].matched_skills;
    				validate_each_argument(each_value_2);
    				let i;

    				for (i = 0; i < each_value_2.length; i += 1) {
    					const child_ctx = get_each_context_2(ctx, each_value_2, i);

    					if (each_blocks_2[i]) {
    						each_blocks_2[i].p(child_ctx, dirty);
    						transition_in(each_blocks_2[i], 1);
    					} else {
    						each_blocks_2[i] = create_each_block_2(child_ctx);
    						each_blocks_2[i].c();
    						transition_in(each_blocks_2[i], 1);
    						each_blocks_2[i].m(div4, t11);
    					}
    				}

    				group_outros();

    				for (i = each_value_2.length; i < each_blocks_2.length; i += 1) {
    					out(i);
    				}

    				check_outros();
    			}

    			if (/*report*/ ctx[0].matched_skills.length === 0) {
    				if (if_block0) ; else {
    					if_block0 = create_if_block_3(ctx);
    					if_block0.c();
    					if_block0.m(div4, null);
    				}
    			} else if (if_block0) {
    				if_block0.d(1);
    				if_block0 = null;
    			}

    			if (dirty & /*report*/ 1) {
    				each_value_1 = /*report*/ ctx[0].missing_skills;
    				validate_each_argument(each_value_1);
    				let i;

    				for (i = 0; i < each_value_1.length; i += 1) {
    					const child_ctx = get_each_context_1(ctx, each_value_1, i);

    					if (each_blocks_1[i]) {
    						each_blocks_1[i].p(child_ctx, dirty);
    					} else {
    						each_blocks_1[i] = create_each_block_1(child_ctx);
    						each_blocks_1[i].c();
    						each_blocks_1[i].m(div6, t17);
    					}
    				}

    				for (; i < each_blocks_1.length; i += 1) {
    					each_blocks_1[i].d(1);
    				}

    				each_blocks_1.length = each_value_1.length;
    			}

    			if (/*report*/ ctx[0].missing_skills.length === 0) {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);
    				} else {
    					if_block1 = create_if_block_1$2(ctx);
    					if_block1.c();
    					if_block1.m(div6, null);
    				}
    			} else if (if_block1) {
    				if_block1.d(1);
    				if_block1 = null;
    			}

    			if (dirty & /*report*/ 1) {
    				each_value = /*report*/ ctx[0].recommendations;
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$1(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block$1(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(ul, t23);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}
    		},
    		i: function intro(local) {
    			if (current) return;

    			for (let i = 0; i < each_value_2.length; i += 1) {
    				transition_in(each_blocks_2[i]);
    			}

    			if (!div5_intro) {
    				add_render_callback(() => {
    					div5_intro = create_in_transition(div5, fly, { y: 20, delay: 100 });
    					div5_intro.start();
    				});
    			}

    			if (!div7_intro) {
    				add_render_callback(() => {
    					div7_intro = create_in_transition(div7, fly, { y: 20, delay: 200 });
    					div7_intro.start();
    				});
    			}

    			if (!div8_intro) {
    				add_render_callback(() => {
    					div8_intro = create_in_transition(div8, fly, { y: 20, delay: 300 });
    					div8_intro.start();
    				});
    			}

    			current = true;
    		},
    		o: function outro(local) {
    			each_blocks_2 = each_blocks_2.filter(Boolean);

    			for (let i = 0; i < each_blocks_2.length; i += 1) {
    				transition_out(each_blocks_2[i]);
    			}

    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div9);
    			destroy_each(each_blocks_2, detaching);
    			if (if_block0) if_block0.d();
    			destroy_each(each_blocks_1, detaching);
    			if (if_block1) if_block1.d();
    			destroy_each(each_blocks, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$2.name,
    		type: "if",
    		source: "(28:4) {#if report}",
    		ctx
    	});

    	return block;
    }

    // (52:20) {#each report.matched_skills as skill}
    function create_each_block_2(ctx) {
    	let skilltag;
    	let current;

    	skilltag = new SkillTag({
    			props: { skill: /*skill*/ ctx[5] },
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(skilltag.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(skilltag, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const skilltag_changes = {};
    			if (dirty & /*report*/ 1) skilltag_changes.skill = /*skill*/ ctx[5];
    			skilltag.$set(skilltag_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(skilltag.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(skilltag.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(skilltag, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_2.name,
    		type: "each",
    		source: "(52:20) {#each report.matched_skills as skill}",
    		ctx
    	});

    	return block;
    }

    // (55:20) {#if report.matched_skills.length === 0}
    function create_if_block_3(ctx) {
    	let p;

    	const block = {
    		c: function create() {
    			p = element("p");
    			p.textContent = "No direct keyword matches found.";
    			attr_dev(p, "class", "empty");
    			add_location(p, file$2, 55, 24, 2242);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_3.name,
    		type: "if",
    		source: "(55:20) {#if report.matched_skills.length === 0}",
    		ctx
    	});

    	return block;
    }

    // (66:20) {#each report.missing_skills as skill}
    function create_each_block_1(ctx) {
    	let div;
    	let t_value = /*skill*/ ctx[5] + "";
    	let t;

    	const block = {
    		c: function create() {
    			div = element("div");
    			t = text(t_value);
    			attr_dev(div, "class", "missing-tag svelte-1o2wtdi");
    			add_location(div, file$2, 66, 24, 2754);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*report*/ 1 && t_value !== (t_value = /*skill*/ ctx[5] + "")) set_data_dev(t, t_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_1.name,
    		type: "each",
    		source: "(66:20) {#each report.missing_skills as skill}",
    		ctx
    	});

    	return block;
    }

    // (70:20) {#if report.missing_skills.length === 0}
    function create_if_block_1$2(ctx) {
    	let if_block_anchor;

    	function select_block_type(ctx, dirty) {
    		if (/*report*/ ctx[0].score > 85) return create_if_block_2;
    		return create_else_block$2;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block = current_block_type(ctx);

    	const block = {
    		c: function create() {
    			if_block.c();
    			if_block_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (current_block_type !== (current_block_type = select_block_type(ctx))) {
    				if_block.d(1);
    				if_block = current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			}
    		},
    		d: function destroy(detaching) {
    			if_block.d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1$2.name,
    		type: "if",
    		source: "(70:20) {#if report.missing_skills.length === 0}",
    		ctx
    	});

    	return block;
    }

    // (73:24) {:else}
    function create_else_block$2(ctx) {
    	let p;

    	const block = {
    		c: function create() {
    			p = element("p");
    			p.textContent = "⚠️ Insufficient Data: Your Job Description might be too short. Add more technical requirements for a better analysis.";
    			attr_dev(p, "class", "warning-msg svelte-1o2wtdi");
    			add_location(p, file$2, 73, 28, 3118);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block$2.name,
    		type: "else",
    		source: "(73:24) {:else}",
    		ctx
    	});

    	return block;
    }

    // (71:24) {#if report.score > 85}
    function create_if_block_2(ctx) {
    	let p;

    	const block = {
    		c: function create() {
    			p = element("p");
    			p.textContent = "✨ Perfect Match! No missing technical skills found.";
    			attr_dev(p, "class", "success-msg svelte-1o2wtdi");
    			add_location(p, file$2, 71, 28, 2979);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2.name,
    		type: "if",
    		source: "(71:24) {#if report.score > 85}",
    		ctx
    	});

    	return block;
    }

    // (85:20) {#each report.recommendations as rec}
    function create_each_block$1(ctx) {
    	let li;
    	let t_value = /*rec*/ ctx[2] + "";
    	let t;

    	const block = {
    		c: function create() {
    			li = element("li");
    			t = text(t_value);
    			attr_dev(li, "class", "svelte-1o2wtdi");
    			add_location(li, file$2, 85, 24, 3750);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, li, anchor);
    			append_dev(li, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*report*/ 1 && t_value !== (t_value = /*rec*/ ctx[2] + "")) set_data_dev(t, t_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(li);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block$1.name,
    		type: "each",
    		source: "(85:20) {#each report.recommendations as rec}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$3(ctx) {
    	let div1;
    	let div0;
    	let button;
    	let t1;
    	let h1;
    	let t3;
    	let div1_intro;
    	let current;
    	let mounted;
    	let dispose;
    	let if_block = /*report*/ ctx[0] && create_if_block$2(ctx);

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			div0 = element("div");
    			button = element("button");
    			button.textContent = "← Back to Ranking";
    			t1 = space();
    			h1 = element("h1");
    			h1.textContent = "AI Diagnostic Report";
    			t3 = space();
    			if (if_block) if_block.c();
    			attr_dev(button, "class", "back-btn svelte-1o2wtdi");
    			add_location(button, file$2, 23, 8, 605);
    			add_location(h1, file$2, 24, 8, 701);
    			attr_dev(div0, "class", "header svelte-1o2wtdi");
    			add_location(div0, file$2, 22, 4, 576);
    			attr_dev(div1, "class", "reasoning-page svelte-1o2wtdi");
    			add_location(div1, file$2, 21, 0, 535);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, div0);
    			append_dev(div0, button);
    			append_dev(div0, t1);
    			append_dev(div0, h1);
    			append_dev(div1, t3);
    			if (if_block) if_block.m(div1, null);
    			current = true;

    			if (!mounted) {
    				dispose = listen_dev(button, "click", /*click_handler*/ ctx[1], false, false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (/*report*/ ctx[0]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);

    					if (dirty & /*report*/ 1) {
    						transition_in(if_block, 1);
    					}
    				} else {
    					if_block = create_if_block$2(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(div1, null);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);

    			if (!div1_intro) {
    				add_render_callback(() => {
    					div1_intro = create_in_transition(div1, fade, {});
    					div1_intro.start();
    				});
    			}

    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);
    			if (if_block) if_block.d();
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$3.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$3($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Reasoning', slots, []);
    	let report = null;

    	onMount(() => {
    		reasoningReport.subscribe(val => {
    			$$invalidate(0, report = val);
    		});

    		// If no report data, go back to ranking
    		if (!report) {
    			push('/dash/rank');
    		}
    	});

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Reasoning> was created with unknown prop '${key}'`);
    	});

    	const click_handler = () => push('/dash/rank');

    	$$self.$capture_state = () => ({
    		onMount,
    		reasoningReport,
    		fade,
    		fly,
    		slide,
    		SkillTag,
    		push,
    		report
    	});

    	$$self.$inject_state = $$props => {
    		if ('report' in $$props) $$invalidate(0, report = $$props.report);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [report, click_handler];
    }

    class Reasoning extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Reasoning",
    			options,
    			id: create_fragment$3.name
    		});
    	}
    }

    /* src\pages\dash\DashParent.svelte generated by Svelte v3.59.2 */
    const file$1 = "src\\pages\\dash\\DashParent.svelte";

    // (71:20) {:else}
    function create_else_block_1(ctx) {
    	let li0;
    	let a0;
    	let span0;
    	let t1;
    	let t2;
    	let li1;
    	let a1;
    	let span1;
    	let t4;

    	const block = {
    		c: function create() {
    			li0 = element("li");
    			a0 = element("a");
    			span0 = element("span");
    			span0.textContent = "📄";
    			t1 = text(" My Application");
    			t2 = space();
    			li1 = element("li");
    			a1 = element("a");
    			span1 = element("span");
    			span1.textContent = "💼";
    			t4 = text(" Job Feed");
    			attr_dev(span0, "class", "nav-icon svelte-iwgb0t");
    			add_location(span0, file$1, 73, 32, 2634);
    			attr_dev(a0, "href", "/#/dash/manage");
    			attr_dev(a0, "class", "svelte-iwgb0t");
    			toggle_class(a0, "active", /*isActive*/ ctx[2]('/dash/manage'));
    			add_location(a0, file$1, 72, 28, 2536);
    			attr_dev(li0, "class", "svelte-iwgb0t");
    			add_location(li0, file$1, 71, 24, 2503);
    			attr_dev(span1, "class", "nav-icon svelte-iwgb0t");
    			add_location(span1, file$1, 78, 32, 2896);
    			attr_dev(a1, "href", "/#/dash/rank");
    			attr_dev(a1, "class", "svelte-iwgb0t");
    			toggle_class(a1, "active", /*isActive*/ ctx[2]('/dash/rank'));
    			add_location(a1, file$1, 77, 28, 2802);
    			attr_dev(li1, "class", "svelte-iwgb0t");
    			add_location(li1, file$1, 76, 24, 2769);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, li0, anchor);
    			append_dev(li0, a0);
    			append_dev(a0, span0);
    			append_dev(a0, t1);
    			insert_dev(target, t2, anchor);
    			insert_dev(target, li1, anchor);
    			append_dev(li1, a1);
    			append_dev(a1, span1);
    			append_dev(a1, t4);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*isActive*/ 4) {
    				toggle_class(a0, "active", /*isActive*/ ctx[2]('/dash/manage'));
    			}

    			if (dirty & /*isActive*/ 4) {
    				toggle_class(a1, "active", /*isActive*/ ctx[2]('/dash/rank'));
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(li0);
    			if (detaching) detach_dev(t2);
    			if (detaching) detach_dev(li1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block_1.name,
    		type: "else",
    		source: "(71:20) {:else}",
    		ctx
    	});

    	return block;
    }

    // (55:20) {#if userRole === 'recruiter'}
    function create_if_block_1$1(ctx) {
    	let li0;
    	let a0;
    	let span0;
    	let t1;
    	let t2;
    	let li1;
    	let a1;
    	let span1;
    	let t4;
    	let t5;
    	let li2;
    	let a2;
    	let span2;
    	let t7;

    	const block = {
    		c: function create() {
    			li0 = element("li");
    			a0 = element("a");
    			span0 = element("span");
    			span0.textContent = "📁";
    			t1 = text(" Manage Resumes");
    			t2 = space();
    			li1 = element("li");
    			a1 = element("a");
    			span1 = element("span");
    			span1.textContent = "📊";
    			t4 = text(" AI Ranking");
    			t5 = space();
    			li2 = element("li");
    			a2 = element("a");
    			span2 = element("span");
    			span2.textContent = "📈";
    			t7 = text(" Analytics");
    			attr_dev(span0, "class", "nav-icon svelte-iwgb0t");
    			add_location(span0, file$1, 57, 32, 1823);
    			attr_dev(a0, "href", "/#/dash/manage");
    			attr_dev(a0, "class", "svelte-iwgb0t");
    			toggle_class(a0, "active", /*isActive*/ ctx[2]('/dash/manage'));
    			add_location(a0, file$1, 56, 28, 1725);
    			attr_dev(li0, "class", "svelte-iwgb0t");
    			add_location(li0, file$1, 55, 24, 1692);
    			attr_dev(span1, "class", "nav-icon svelte-iwgb0t");
    			add_location(span1, file$1, 62, 32, 2085);
    			attr_dev(a1, "href", "/#/dash/rank");
    			attr_dev(a1, "class", "svelte-iwgb0t");
    			toggle_class(a1, "active", /*isActive*/ ctx[2]('/dash/rank'));
    			add_location(a1, file$1, 61, 28, 1991);
    			attr_dev(li1, "class", "svelte-iwgb0t");
    			add_location(li1, file$1, 60, 24, 1958);
    			attr_dev(span2, "class", "nav-icon svelte-iwgb0t");
    			add_location(span2, file$1, 67, 32, 2345);
    			attr_dev(a2, "href", "/#/dash/stats");
    			attr_dev(a2, "class", "svelte-iwgb0t");
    			toggle_class(a2, "active", /*isActive*/ ctx[2]('/dash/stats'));
    			add_location(a2, file$1, 66, 28, 2249);
    			attr_dev(li2, "class", "svelte-iwgb0t");
    			add_location(li2, file$1, 65, 24, 2216);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, li0, anchor);
    			append_dev(li0, a0);
    			append_dev(a0, span0);
    			append_dev(a0, t1);
    			insert_dev(target, t2, anchor);
    			insert_dev(target, li1, anchor);
    			append_dev(li1, a1);
    			append_dev(a1, span1);
    			append_dev(a1, t4);
    			insert_dev(target, t5, anchor);
    			insert_dev(target, li2, anchor);
    			append_dev(li2, a2);
    			append_dev(a2, span2);
    			append_dev(a2, t7);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*isActive*/ 4) {
    				toggle_class(a0, "active", /*isActive*/ ctx[2]('/dash/manage'));
    			}

    			if (dirty & /*isActive*/ 4) {
    				toggle_class(a1, "active", /*isActive*/ ctx[2]('/dash/rank'));
    			}

    			if (dirty & /*isActive*/ 4) {
    				toggle_class(a2, "active", /*isActive*/ ctx[2]('/dash/stats'));
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(li0);
    			if (detaching) detach_dev(t2);
    			if (detaching) detach_dev(li1);
    			if (detaching) detach_dev(t5);
    			if (detaching) detach_dev(li2);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1$1.name,
    		type: "if",
    		source: "(55:20) {#if userRole === 'recruiter'}",
    		ctx
    	});

    	return block;
    }

    // (116:16) {:else}
    function create_else_block$1(ctx) {
    	let t_value = (/*isActive*/ ctx[2]('/dash/manage')
    	? 'My Professional Profile'
    	: /*isActive*/ ctx[2]('/dash/rank')
    		? 'Discover Opportunities'
    		: /*isActive*/ ctx[2]('/dash/change')
    			? 'Account Settings'
    			: 'Candidate Portal') + "";

    	let t;

    	const block = {
    		c: function create() {
    			t = text(t_value);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*isActive*/ 4 && t_value !== (t_value = (/*isActive*/ ctx[2]('/dash/manage')
    			? 'My Professional Profile'
    			: /*isActive*/ ctx[2]('/dash/rank')
    				? 'Discover Opportunities'
    				: /*isActive*/ ctx[2]('/dash/change')
    					? 'Account Settings'
    					: 'Candidate Portal') + "")) set_data_dev(t, t_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block$1.name,
    		type: "else",
    		source: "(116:16) {:else}",
    		ctx
    	});

    	return block;
    }

    // (111:16) {#if userRole === 'recruiter'}
    function create_if_block$1(ctx) {
    	let t_value = (/*isActive*/ ctx[2]('/dash/manage')
    	? 'Resume Management'
    	: /*isActive*/ ctx[2]('/dash/rank')
    		? 'AI Ranking Engine'
    		: /*isActive*/ ctx[2]('/dash/stats')
    			? 'Talent Analytics'
    			: /*isActive*/ ctx[2]('/dash/change')
    				? 'Account Settings'
    				: 'Recruiter Dashboard') + "";

    	let t;

    	const block = {
    		c: function create() {
    			t = text(t_value);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*isActive*/ 4 && t_value !== (t_value = (/*isActive*/ ctx[2]('/dash/manage')
    			? 'Resume Management'
    			: /*isActive*/ ctx[2]('/dash/rank')
    				? 'AI Ranking Engine'
    				: /*isActive*/ ctx[2]('/dash/stats')
    					? 'Talent Analytics'
    					: /*isActive*/ ctx[2]('/dash/change')
    						? 'Account Settings'
    						: 'Recruiter Dashboard') + "")) set_data_dev(t, t_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$1.name,
    		type: "if",
    		source: "(111:16) {#if userRole === 'recruiter'}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$2(ctx) {
    	let div10;
    	let aside;
    	let div5;
    	let div1;
    	let div0;
    	let t1;
    	let span0;
    	let t3;
    	let div4;
    	let div2;
    	let t4_value = /*userName*/ ctx[1][0] + "";
    	let t4;
    	let t5;
    	let div3;
    	let p0;
    	let t6;
    	let t7;
    	let p1;
    	let t8_value = /*userRole*/ ctx[0].toUpperCase() + "";
    	let t8;
    	let t9;
    	let nav;
    	let ul;
    	let t10;
    	let li0;
    	let a0;
    	let span1;
    	let t12;
    	let t13;
    	let li1;
    	let a1;
    	let span2;
    	let t15;
    	let t16;
    	let div7;
    	let div6;
    	let themetoggle;
    	let t17;
    	let a2;
    	let span3;
    	let t19;
    	let t20;
    	let main;
    	let div8;
    	let h2;
    	let t21;
    	let div9;
    	let router;
    	let current;

    	function select_block_type(ctx, dirty) {
    		if (/*userRole*/ ctx[0] === 'recruiter') return create_if_block_1$1;
    		return create_else_block_1;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block0 = current_block_type(ctx);
    	themetoggle = new ThemeToggle({ $$inline: true });

    	function select_block_type_1(ctx, dirty) {
    		if (/*userRole*/ ctx[0] === 'recruiter') return create_if_block$1;
    		return create_else_block$1;
    	}

    	let current_block_type_1 = select_block_type_1(ctx);
    	let if_block1 = current_block_type_1(ctx);

    	router = new Router({
    			props: { routes: /*routes*/ ctx[3] },
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			div10 = element("div");
    			aside = element("aside");
    			div5 = element("div");
    			div1 = element("div");
    			div0 = element("div");
    			div0.textContent = "TS";
    			t1 = space();
    			span0 = element("span");
    			span0.textContent = "TalentScanAI";
    			t3 = space();
    			div4 = element("div");
    			div2 = element("div");
    			t4 = text(t4_value);
    			t5 = space();
    			div3 = element("div");
    			p0 = element("p");
    			t6 = text(/*userName*/ ctx[1]);
    			t7 = space();
    			p1 = element("p");
    			t8 = text(t8_value);
    			t9 = space();
    			nav = element("nav");
    			ul = element("ul");
    			if_block0.c();
    			t10 = space();
    			li0 = element("li");
    			a0 = element("a");
    			span1 = element("span");
    			span1.textContent = "🎧";
    			t12 = text(" Support");
    			t13 = space();
    			li1 = element("li");
    			a1 = element("a");
    			span2 = element("span");
    			span2.textContent = "⚙️";
    			t15 = text(" Settings");
    			t16 = space();
    			div7 = element("div");
    			div6 = element("div");
    			create_component(themetoggle.$$.fragment);
    			t17 = space();
    			a2 = element("a");
    			span3 = element("span");
    			span3.textContent = "🚪";
    			t19 = text(" Logout");
    			t20 = space();
    			main = element("main");
    			div8 = element("div");
    			h2 = element("h2");
    			if_block1.c();
    			t21 = space();
    			div9 = element("div");
    			create_component(router.$$.fragment);
    			attr_dev(div0, "class", "logo-icon svelte-iwgb0t");
    			add_location(div0, file$1, 40, 16, 1178);
    			attr_dev(span0, "class", "svelte-iwgb0t");
    			add_location(span0, file$1, 41, 16, 1226);
    			attr_dev(div1, "class", "logo svelte-iwgb0t");
    			add_location(div1, file$1, 39, 12, 1143);
    			attr_dev(div2, "class", "u-avatar svelte-iwgb0t");
    			add_location(div2, file$1, 45, 16, 1324);
    			attr_dev(p0, "class", "u-name svelte-iwgb0t");
    			add_location(p0, file$1, 47, 20, 1423);
    			attr_dev(p1, "class", "u-role svelte-iwgb0t");
    			add_location(p1, file$1, 48, 20, 1476);
    			attr_dev(div3, "class", "u-info");
    			add_location(div3, file$1, 46, 16, 1382);
    			attr_dev(div4, "class", "user-pill svelte-iwgb0t");
    			add_location(div4, file$1, 44, 12, 1284);
    			attr_dev(span1, "class", "nav-icon svelte-iwgb0t");
    			add_location(span1, file$1, 85, 28, 3193);
    			attr_dev(a0, "href", "/#/dash/support");
    			attr_dev(a0, "class", "svelte-iwgb0t");
    			toggle_class(a0, "active", /*isActive*/ ctx[2]('/dash/support'));
    			add_location(a0, file$1, 84, 24, 3097);
    			attr_dev(li0, "class", "svelte-iwgb0t");
    			add_location(li0, file$1, 83, 20, 3068);
    			attr_dev(span2, "class", "nav-icon svelte-iwgb0t");
    			add_location(span2, file$1, 90, 28, 3432);
    			attr_dev(a1, "href", "/#/dash/change");
    			attr_dev(a1, "class", "svelte-iwgb0t");
    			toggle_class(a1, "active", /*isActive*/ ctx[2]('/dash/change'));
    			add_location(a1, file$1, 89, 24, 3338);
    			attr_dev(li1, "class", "svelte-iwgb0t");
    			add_location(li1, file$1, 88, 20, 3309);
    			attr_dev(ul, "class", "svelte-iwgb0t");
    			add_location(ul, file$1, 53, 16, 1612);
    			attr_dev(nav, "class", "svelte-iwgb0t");
    			add_location(nav, file$1, 52, 12, 1590);
    			attr_dev(div5, "class", "top-section");
    			add_location(div5, file$1, 38, 8, 1105);
    			attr_dev(div6, "class", "theme-wrapper");
    			add_location(div6, file$1, 98, 12, 3635);
    			attr_dev(span3, "class", "nav-icon svelte-iwgb0t");
    			add_location(span3, file$1, 102, 16, 3787);
    			attr_dev(a2, "href", "/#/auth/logout");
    			attr_dev(a2, "class", "logout-btn svelte-iwgb0t");
    			add_location(a2, file$1, 101, 12, 3726);
    			attr_dev(div7, "class", "bottom-section svelte-iwgb0t");
    			add_location(div7, file$1, 97, 8, 3594);
    			attr_dev(aside, "class", "sidebar svelte-iwgb0t");
    			add_location(aside, file$1, 37, 4, 1073);
    			add_location(h2, file$1, 109, 12, 3952);
    			attr_dev(div8, "class", "glass-header svelte-iwgb0t");
    			add_location(div8, file$1, 108, 8, 3913);
    			attr_dev(div9, "class", "page-content svelte-iwgb0t");
    			add_location(div9, file$1, 122, 8, 4632);
    			attr_dev(main, "class", "main-content svelte-iwgb0t");
    			add_location(main, file$1, 107, 4, 3877);
    			attr_dev(div10, "class", "container svelte-iwgb0t");
    			add_location(div10, file$1, 36, 0, 1045);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div10, anchor);
    			append_dev(div10, aside);
    			append_dev(aside, div5);
    			append_dev(div5, div1);
    			append_dev(div1, div0);
    			append_dev(div1, t1);
    			append_dev(div1, span0);
    			append_dev(div5, t3);
    			append_dev(div5, div4);
    			append_dev(div4, div2);
    			append_dev(div2, t4);
    			append_dev(div4, t5);
    			append_dev(div4, div3);
    			append_dev(div3, p0);
    			append_dev(p0, t6);
    			append_dev(div3, t7);
    			append_dev(div3, p1);
    			append_dev(p1, t8);
    			append_dev(div5, t9);
    			append_dev(div5, nav);
    			append_dev(nav, ul);
    			if_block0.m(ul, null);
    			append_dev(ul, t10);
    			append_dev(ul, li0);
    			append_dev(li0, a0);
    			append_dev(a0, span1);
    			append_dev(a0, t12);
    			append_dev(ul, t13);
    			append_dev(ul, li1);
    			append_dev(li1, a1);
    			append_dev(a1, span2);
    			append_dev(a1, t15);
    			append_dev(aside, t16);
    			append_dev(aside, div7);
    			append_dev(div7, div6);
    			mount_component(themetoggle, div6, null);
    			append_dev(div7, t17);
    			append_dev(div7, a2);
    			append_dev(a2, span3);
    			append_dev(a2, t19);
    			append_dev(div10, t20);
    			append_dev(div10, main);
    			append_dev(main, div8);
    			append_dev(div8, h2);
    			if_block1.m(h2, null);
    			append_dev(main, t21);
    			append_dev(main, div9);
    			mount_component(router, div9, null);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if ((!current || dirty & /*userName*/ 2) && t4_value !== (t4_value = /*userName*/ ctx[1][0] + "")) set_data_dev(t4, t4_value);
    			if (!current || dirty & /*userName*/ 2) set_data_dev(t6, /*userName*/ ctx[1]);
    			if ((!current || dirty & /*userRole*/ 1) && t8_value !== (t8_value = /*userRole*/ ctx[0].toUpperCase() + "")) set_data_dev(t8, t8_value);

    			if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block0) {
    				if_block0.p(ctx, dirty);
    			} else {
    				if_block0.d(1);
    				if_block0 = current_block_type(ctx);

    				if (if_block0) {
    					if_block0.c();
    					if_block0.m(ul, t10);
    				}
    			}

    			if (!current || dirty & /*isActive*/ 4) {
    				toggle_class(a0, "active", /*isActive*/ ctx[2]('/dash/support'));
    			}

    			if (!current || dirty & /*isActive*/ 4) {
    				toggle_class(a1, "active", /*isActive*/ ctx[2]('/dash/change'));
    			}

    			if (current_block_type_1 === (current_block_type_1 = select_block_type_1(ctx)) && if_block1) {
    				if_block1.p(ctx, dirty);
    			} else {
    				if_block1.d(1);
    				if_block1 = current_block_type_1(ctx);

    				if (if_block1) {
    					if_block1.c();
    					if_block1.m(h2, null);
    				}
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(themetoggle.$$.fragment, local);
    			transition_in(router.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(themetoggle.$$.fragment, local);
    			transition_out(router.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div10);
    			if_block0.d();
    			destroy_component(themetoggle);
    			if_block1.d();
    			destroy_component(router);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let isActive;
    	let $location;
    	validate_store(location, 'location');
    	component_subscribe($$self, location, $$value => $$invalidate(4, $location = $$value));
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('DashParent', slots, []);
    	let userRole = 'candidate';
    	let userName = 'User';
    	let userEmail = '';

    	onMount(() => {
    		$$invalidate(0, userRole = localStorage.getItem('role') || 'candidate');
    		$$invalidate(1, userName = localStorage.getItem('name') || 'User');
    		userEmail = localStorage.getItem('email') || '';
    	});

    	const routes = {
    		'/dash/change': Change,
    		'/dash/education': Education,
    		'/dash/manage': Manage,
    		'/dash/rank': Rank,
    		'/dash/support': Support,
    		'/dash/stats': Stats,
    		'/dash/reasoning': Reasoning
    	};

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<DashParent> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({
    		Router,
    		location,
    		ThemeToggle,
    		onMount,
    		Change,
    		Education,
    		Manage,
    		Rank,
    		Support,
    		Stats,
    		Reasoning,
    		userRole,
    		userName,
    		userEmail,
    		routes,
    		isActive,
    		$location
    	});

    	$$self.$inject_state = $$props => {
    		if ('userRole' in $$props) $$invalidate(0, userRole = $$props.userRole);
    		if ('userName' in $$props) $$invalidate(1, userName = $$props.userName);
    		if ('userEmail' in $$props) userEmail = $$props.userEmail;
    		if ('isActive' in $$props) $$invalidate(2, isActive = $$props.isActive);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*$location*/ 16) {
    			$$invalidate(2, isActive = path => $location === path);
    		}
    	};

    	return [userRole, userName, isActive, routes, $location];
    }

    class DashParent extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "DashParent",
    			options,
    			id: create_fragment$2.name
    		});
    	}
    }

    function flip(node, { from, to }, params = {}) {
        const style = getComputedStyle(node);
        const transform = style.transform === 'none' ? '' : style.transform;
        const [ox, oy] = style.transformOrigin.split(' ').map(parseFloat);
        const dx = (from.left + from.width * ox / to.width) - (to.left + ox);
        const dy = (from.top + from.height * oy / to.height) - (to.top + oy);
        const { delay = 0, duration = (d) => Math.sqrt(d) * 120, easing = cubicOut } = params;
        return {
            delay,
            duration: is_function(duration) ? duration(Math.sqrt(dx * dx + dy * dy)) : duration,
            easing,
            css: (t, u) => {
                const x = u * dx;
                const y = u * dy;
                const sx = t + u * from.width / to.width;
                const sy = t + u * from.height / to.height;
                return `transform: ${transform} translate(${x}px, ${y}px) scale(${sx}, ${sy});`;
            }
        };
    }

    /* src\components\Toast.svelte generated by Svelte v3.59.2 */
    const file = "src\\components\\Toast.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[2] = list[i];
    	return child_ctx;
    }

    // (20:16) {:else}
    function create_else_block(ctx) {
    	let span;

    	const block = {
    		c: function create() {
    			span = element("span");
    			span.textContent = "ℹ️";
    			attr_dev(span, "class", "icon svelte-1i1zq2z");
    			add_location(span, file, 20, 20, 789);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(span);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block.name,
    		type: "else",
    		source: "(20:16) {:else}",
    		ctx
    	});

    	return block;
    }

    // (18:56) 
    function create_if_block_1(ctx) {
    	let span;

    	const block = {
    		c: function create() {
    			span = element("span");
    			span.textContent = "❌";
    			attr_dev(span, "class", "icon svelte-1i1zq2z");
    			add_location(span, file, 18, 20, 717);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(span);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(18:56) ",
    		ctx
    	});

    	return block;
    }

    // (16:16) {#if notification.type === 'success'}
    function create_if_block(ctx) {
    	let span;

    	const block = {
    		c: function create() {
    			span = element("span");
    			span.textContent = "✅";
    			attr_dev(span, "class", "icon svelte-1i1zq2z");
    			add_location(span, file, 16, 20, 612);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(span);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(16:16) {#if notification.type === 'success'}",
    		ctx
    	});

    	return block;
    }

    // (8:4) {#each $notifications as notification (notification.id)}
    function create_each_block(key_1, ctx) {
    	let div1;
    	let div0;
    	let t0;
    	let p;
    	let t1_value = /*notification*/ ctx[2].message + "";
    	let t1;
    	let t2;
    	let button;
    	let t4;
    	let div1_class_value;
    	let div1_intro;
    	let div1_outro;
    	let rect;
    	let stop_animation = noop;
    	let current;
    	let mounted;
    	let dispose;

    	function select_block_type(ctx, dirty) {
    		if (/*notification*/ ctx[2].type === 'success') return create_if_block;
    		if (/*notification*/ ctx[2].type === 'error') return create_if_block_1;
    		return create_else_block;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block = current_block_type(ctx);

    	function click_handler() {
    		return /*click_handler*/ ctx[1](/*notification*/ ctx[2]);
    	}

    	const block = {
    		key: key_1,
    		first: null,
    		c: function create() {
    			div1 = element("div");
    			div0 = element("div");
    			if_block.c();
    			t0 = space();
    			p = element("p");
    			t1 = text(t1_value);
    			t2 = space();
    			button = element("button");
    			button.textContent = "×";
    			t4 = space();
    			attr_dev(p, "class", "svelte-1i1zq2z");
    			add_location(p, file, 22, 16, 856);
    			attr_dev(div0, "class", "content svelte-1i1zq2z");
    			add_location(div0, file, 14, 12, 516);
    			attr_dev(button, "class", "svelte-1i1zq2z");
    			add_location(button, file, 24, 12, 917);
    			attr_dev(div1, "class", div1_class_value = "notification " + /*notification*/ ctx[2].type + " svelte-1i1zq2z");
    			add_location(div1, file, 8, 8, 302);
    			this.first = div1;
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, div0);
    			if_block.m(div0, null);
    			append_dev(div0, t0);
    			append_dev(div0, p);
    			append_dev(p, t1);
    			append_dev(div1, t2);
    			append_dev(div1, button);
    			append_dev(div1, t4);
    			current = true;

    			if (!mounted) {
    				dispose = listen_dev(button, "click", click_handler, false, false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;

    			if (current_block_type !== (current_block_type = select_block_type(ctx))) {
    				if_block.d(1);
    				if_block = current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					if_block.m(div0, t0);
    				}
    			}

    			if ((!current || dirty & /*$notifications*/ 1) && t1_value !== (t1_value = /*notification*/ ctx[2].message + "")) set_data_dev(t1, t1_value);

    			if (!current || dirty & /*$notifications*/ 1 && div1_class_value !== (div1_class_value = "notification " + /*notification*/ ctx[2].type + " svelte-1i1zq2z")) {
    				attr_dev(div1, "class", div1_class_value);
    			}
    		},
    		r: function measure() {
    			rect = div1.getBoundingClientRect();
    		},
    		f: function fix() {
    			fix_position(div1);
    			stop_animation();
    			add_transform(div1, rect);
    		},
    		a: function animate() {
    			stop_animation();
    			stop_animation = create_animation(div1, rect, flip, { duration: 300 });
    		},
    		i: function intro(local) {
    			if (current) return;

    			add_render_callback(() => {
    				if (!current) return;
    				if (div1_outro) div1_outro.end(1);
    				div1_intro = create_in_transition(div1, fly, { y: 50, duration: 300 });
    				div1_intro.start();
    			});

    			current = true;
    		},
    		o: function outro(local) {
    			if (div1_intro) div1_intro.invalidate();
    			div1_outro = create_out_transition(div1, fade, { duration: 200 });
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);
    			if_block.d();
    			if (detaching && div1_outro) div1_outro.end();
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(8:4) {#each $notifications as notification (notification.id)}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$1(ctx) {
    	let div;
    	let each_blocks = [];
    	let each_1_lookup = new Map();
    	let current;
    	let each_value = /*$notifications*/ ctx[0];
    	validate_each_argument(each_value);
    	const get_key = ctx => /*notification*/ ctx[2].id;
    	validate_each_keys(ctx, each_value, get_each_context, get_key);

    	for (let i = 0; i < each_value.length; i += 1) {
    		let child_ctx = get_each_context(ctx, each_value, i);
    		let key = get_key(child_ctx);
    		each_1_lookup.set(key, each_blocks[i] = create_each_block(key, child_ctx));
    	}

    	const block = {
    		c: function create() {
    			div = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr_dev(div, "class", "notification-container svelte-1i1zq2z");
    			add_location(div, file, 6, 0, 196);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				if (each_blocks[i]) {
    					each_blocks[i].m(div, null);
    				}
    			}

    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*$notifications, dismissNotification*/ 1) {
    				each_value = /*$notifications*/ ctx[0];
    				validate_each_argument(each_value);
    				group_outros();
    				for (let i = 0; i < each_blocks.length; i += 1) each_blocks[i].r();
    				validate_each_keys(ctx, each_value, get_each_context, get_key);
    				each_blocks = update_keyed_each(each_blocks, dirty, get_key, 1, ctx, each_value, each_1_lookup, div, fix_and_outro_and_destroy_block, create_each_block, null, get_each_context);
    				for (let i = 0; i < each_blocks.length; i += 1) each_blocks[i].a();
    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;

    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o: function outro(local) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].d();
    			}
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let $notifications;
    	validate_store(notifications, 'notifications');
    	component_subscribe($$self, notifications, $$value => $$invalidate(0, $notifications = $$value));
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Toast', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Toast> was created with unknown prop '${key}'`);
    	});

    	const click_handler = notification => dismissNotification(notification.id);

    	$$self.$capture_state = () => ({
    		notifications,
    		dismissNotification,
    		flip,
    		fade,
    		fly,
    		$notifications
    	});

    	return [$notifications, click_handler];
    }

    class Toast extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Toast",
    			options,
    			id: create_fragment$1.name
    		});
    	}
    }

    /* src\Router.svelte generated by Svelte v3.59.2 */

    function create_fragment(ctx) {
    	let router;
    	let t;
    	let toast;
    	let current;

    	router = new Router({
    			props: { routes: /*routes*/ ctx[0] },
    			$$inline: true
    		});

    	toast = new Toast({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(router.$$.fragment);
    			t = space();
    			create_component(toast.$$.fragment);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			mount_component(router, target, anchor);
    			insert_dev(target, t, anchor);
    			mount_component(toast, target, anchor);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(router.$$.fragment, local);
    			transition_in(toast.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(router.$$.fragment, local);
    			transition_out(toast.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(router, detaching);
    			if (detaching) detach_dev(t);
    			destroy_component(toast, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let $location;
    	validate_store(location, 'location');
    	component_subscribe($$self, location, $$value => $$invalidate(1, $location = $$value));
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Router', slots, []);

    	const routes = {
    		'/auth/*': AuthParent,
    		'/dash/*': DashParent
    	};

    	if ($location == '/') {
    		replace("/auth/login");
    	}

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Router> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({
    		Router,
    		location,
    		replace,
    		AuthParent,
    		DashParent,
    		Toast,
    		routes,
    		$location
    	});

    	return [routes];
    }

    class Router_1 extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Router_1",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    const app = new Router_1({
    	target: document.body
    });

    return app;

})();
//# sourceMappingURL=bundle.js.map
