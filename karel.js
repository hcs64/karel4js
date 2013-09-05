"use strict";

var Karel = (function(){

    var o = {};

    var isInteger = function (n) {
        return +n === n && !(n % 1);
    };

    var isNonnegativeInteger = function (n) {
        return isInteger(n) && n >= 0;
    };

    var isPositiveInteger = function (n) {
        return isInteger(n) && n > 0;
    };

    var NORTH = o.NORTH = 'NORTH';
    var SOUTH = o.SOUTH = 'SOUTH';
    var EAST = o.EAST = 'EAST';
    var WEST = o.WEST = 'WEST';

    var isDirection = function (s) {
        return typeof s == 'string' &&
            (s == NORTH ||
             s == SOUTH ||
             s == EAST ||
             s == WEST);
    };

    var leftOf = function (d) {
        if (d === NORTH)    return WEST;
        if (d === WEST)     return SOUTH;
        if (d === SOUTH)    return EAST;
        if (d === EAST)     return NORTH;

        throw "bad direction";
    };

    var rightOf = function (d) {
        if (d === NORTH)    return EAST;
        if (d === EAST)     return SOUTH;
        if (d === SOUTH)    return WEST;
        if (d === WEST)     return NORTH;

        throw "bad direction";
    };

    var ROBOT_SIZE_PX = 10;
    var BEEPER_RADIUS_PX = 6;
    var AVENUE_DIST_PX = 32;
    var STREET_DIST_PX = 32;

    var addressToPixels = o.addressToPixels = function (street, avenue) {
        return {x: (avenue-0.5) * AVENUE_DIST_PX + 0.5,
                y: (street-0.5) * STREET_DIST_PX + 0.5}
    };

    var pixelsToAddress = o.pixelsToAddress = function (point) {
        return {avenue: point.x / AVENUE_DIST_PX + 0.5,
                street: point.y / STREET_DIST_PX + 0.5};
    };

    var directionToAngle = function (d) {
        if (d === EAST)     return 0;
        if (d === NORTH)    return Math.PI/2;
        if (d === WEST)     return Math.PI;
        if (d === SOUTH)    return Math.PI*3/2;
    };

    var nextAddress = function (street, avenue, d) {
        if (d === EAST)     return {street: street,     avenue: avenue+1};
        if (d === NORTH)    return {street: street+1,   avenue: avenue};
        if (d === WEST)     return {street: street,     avenue: avenue-1};
        if (d === SOUTH)    return {street: street-1,   avenue: avenue};
    };

    var checkMove = function (cur, next, world) {
        var i, l;

        if (next.street <= 0 || next.avenue <= 0) return false;

        if (next.street > world.size.streets ||
            next.avenue > world.size.avenues) return false;

        if (cur.street != next.street) {
            if (cur.avenue != next.avenue) {
                // no diagonal moves
                return false;
            }

            if (Math.abs(cur.street - next.street) != 1) {
                // moving too far or non-integral
                return false;
            }

            for (i = 0, l = world.walls.length; i < l; i++) {
                if (world.walls[i].avenue == cur.avenue &&
                    world.walls[i].street == (cur.street+next.street)/2) {

                    // wall in the middle of this block
                    return false;
                }
            }
        } else if (cur.avenue != next.avenue) {
            if (cur.street != next.street) {
                // no diagonal moves
                return false;
            }

            if (Math.abs(cur.avenue - next.avenue) != 1) {
                // moving too far or non-integral
                return false;
            }

            for (i = 0, l = world.walls.length; i < l; i++) {
                if (world.walls[i].street == cur.street &&
                    world.walls[i].avenue == (cur.avenue+next.avenue)/2) {

                    // wall in the middle of this block
                    return false;
                }
            }
        }

        return true;
    };

    var redraw_World = function () {
        var world = this;
        var ctx = world.context;

        if (!world.dirty) return;

        ctx.save();

        //ctx.resetTransform();
        ctx.setTransform(1,0,0,1,0,0);
        ctx.clearRect(0, 0, ctx.width, ctx.height);
        //ctx.fillStyle = '#f88';
        //ctx.fillRect(0, 0, ctx.width, ctx.height);

        ctx.translate(0, ctx.height);
        ctx.scale(1, -1);

        drawGrid(ctx, world.size.streets , world.size.avenues);
        drawBeepers(ctx, world.beepers, world.size.streets, world.size.avenues);
        drawRobot(ctx, 
            addressToPixels(world.robot.street, world.robot.avenue),
            directionToAngle(world.robot.direction));

        drawWalls(ctx, world.walls);

        if (world.preview_wall) {
            ctx.lineWidth = 3;
            ctx.strokeStyle = '#c00';

            drawWall(ctx, world.preview_wall);
        }
        if (world.preview_beeper) {
            ctx.lineWidth = 3;
            ctx.strokeStyle = '#888';

            drawBeeper(ctx, world.preview_beeper.street, world.preview_beeper.avenue, 1);
        }

        ctx.restore();
    };

    var drawGrid = function (ctx, streets, avenues) {
        var i, start, end;

        ctx.lineWidth = 0.5;
        ctx.strokeStyle = '#aaa';
        ctx.globalAlpha = 1.0;
        ctx.lineCap = 'square';
        ctx.shadowColor = '#0000';
        ctx.globalCompositeOperation = 'source-over';
        //ctx.setLineDash([]);

        ctx.beginPath();

        for (i = 1; i <= avenues; i ++) {
            start = addressToPixels(0.5, i);
            end   = addressToPixels(streets+0.5, i);

            ctx.moveTo(start.x, start.y);
            ctx.lineTo(end.x, end.y);
        }

        for (i = 1; i <= streets; i ++) {
            start = addressToPixels(i, 0.5);
            end   = addressToPixels(i, avenues+0.5);

            ctx.moveTo(start.x, start.y);
            ctx.lineTo(end.x, end.y);
        }

        ctx.stroke();
    };

    //var beeperCountColors = [null, '#00f', '#0f0', '#f00', '#ff0'];

    var drawBeeper = function (ctx, i, j, beeperCount) {
        var p;

        if (beeperCount > 0) {

            p = addressToPixels(i, j);
            //ctx.strokeStyle = beeperCountColors[beepers[i][j]];
            ctx.beginPath();
            ctx.arc(p.x, p.y, BEEPER_RADIUS_PX, 0, Math.PI*2);

            if (beeperCount > 1) {
                ctx.fill();

                ctx.save();
                ctx.setTransform(1,0,0,1,0,0);

                ctx.lineWidth = 1;
                ctx.strokeText(beeperCount, p.x, ctx.height - p.y + 5);
                ctx.restore();
            } else {
                ctx.stroke();
            }
        }
    };

    var drawBeepers = function (ctx, beepers, streets, avenues) {
        var i, j;

        ctx.lineWidth = 1;
        ctx.strokeStyle = '#000';
        ctx.fillStyle = '#fff';
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'center';

        for (i = 1; i <= streets; i++) {
            for (j = 1; j <= avenues; j++) {
                drawBeeper(ctx, i, j, beepers[i][j]);
            }
        }
    };

    var drawRobot = function (ctx, p, r) {
        ctx.save();

        ctx.translate(p.x, p.y);
        ctx.rotate(r);

        ctx.lineWidth = 2;
        ctx.strokeStyle = '#000';

        ctx.beginPath();
        ctx.moveTo(-ROBOT_SIZE_PX/2,-ROBOT_SIZE_PX);
        ctx.lineTo(ROBOT_SIZE_PX,0);
        ctx.lineTo(-ROBOT_SIZE_PX/2, ROBOT_SIZE_PX);
        ctx.stroke();

        ctx.restore();
    };

    var drawWall = function (ctx, wall) {
        var start, end;

        if (wall.street % 1 == .5) {
            // wall across an avenue
            start = addressToPixels(wall.street, wall.avenue-.5);
            end   = addressToPixels(wall.street, wall.avenue+.5);
        } else {
            // wall across an avenue
            start = addressToPixels(wall.street-.5, wall.avenue);
            end   = addressToPixels(wall.street+.5, wall.avenue);
        }

        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(end.x, end.y);
        ctx.stroke();
    };

    var drawWalls = function (ctx, walls) {
        var i, l;
        var start, end;

        ctx.lineWidth = 3.5;
        ctx.strokeStyle = '#000';

        // world borders
        ctx.beginPath();
        ctx.moveTo(0, ctx.height);
        ctx.lineTo(0, 0);
        ctx.lineTo(ctx.width, 0);
        ctx.lineTo(ctx.width, ctx.height);
        ctx.lineTo(0, ctx.height);
        ctx.stroke();

        ctx.lineWidth = 2.5;

        for (i = 0, l = walls.length; i < l; i++) {
            drawWall(ctx, walls[i]);
        }
    };

    o.createWorld = function(canvas, init_opts) {
        var world = {
            size: {},
            canvas: null,
            context: null,
            robot: {},
            walls: [],
            beepers: {}
        };
        var i, j, l, st, av;

        world.dirty = true;
        world.preview_wall = null;
        world.preview_beeper = null;

        if (typeof canvas == 'object') {
            world.canvas = canvas;

            world.context = world.canvas.getContext('2d');
        } else if (typeof canvas !== 'undefined') {
            throw 'bad canvas';
        } else {
            // should just make one?
            throw 'missing canvas';
        }

        // get initial state

        if (typeof init_opts == 'object') {
            if (typeof init_opts.size == 'object' &&
                isPositiveInteger(init_opts.size.streets) &&
                isPositiveInteger(init_opts.size.avenues)) {
                world.size.streets = init_opts.size.streets;
                world.size.avenues = init_opts.size.avenues;
            } else if (isPositiveInteger(init_opts.size)) {
                world.size = {streets: init_opts.size, avenues: init_opts.size};
            } else if (typeof init_opts.size !== 'undefined') {
                throw 'bad size';
            } else {
                world.size.streets = 10;
                world.size.avenues = 10;
            }

            if (typeof init_opts.robot == 'object') {
                if (isPositiveInteger(init_opts.robot.street)) {
                    world.robot.street = init_opts.robot.street;
                } else if (typeof init_opts.robot.street !== 'undefined') {
                    throw 'bad street';
                } else {
                    world.robot.street = 1;
                }

                if (isPositiveInteger(init_opts.robot.avenue)) {
                    world.robot.avenue = init_opts.robot.avenue;
                } else if (typeof init_opts.robot.avenue !== 'undefined') {
                    throw 'bad avenue';
                } else {
                    world.robot.avenue = 1;
                }

                if (isNonnegativeInteger(init_opts.robot.beepers)) {
                    world.robot.beepers =  init_opts.robot.beepers;
                } else if (typeof init_opts.robot.beepers !== 'undefined') {
                    throw 'bad beepers';
                } else {
                    world.robot.beepers = 0;
                }

                if (isDirection(init_opts.robot.direction)) {
                    world.robot.direction = init_opts.robot.direction;
                } else if (typeof init_opts.robot.direction !== 'undefined') {
                    throw 'bad direction';
                } else {
                    world.robot.direction = NORTH;
                }
            } else if (typeof init_opts.robot !== 'undefined') {
                throw 'bad robot';
            } else {
                world.robot = { street: 1, avenue: 1, beepers: 0, direction: NORTH };
            }

            // init beepers (2D array of counts)
            for (i = 1; i <= world.size.streets; i++) {
                world.beepers[i] = {};
                for (j = 1; j <= world.size.avenues; j++) {
                    world.beepers[i][j] = 0;
                }
            }

            if (typeof init_opts.beepers == 'object' && init_opts.beepers.hasOwnProperty('length')) {
                for (i = 0, l = init_opts.beepers.length; i < l; i++) {
                    var count = 1;
                    if (isNonnegativeInteger(init_opts.beepers[i].count)) {
                        count = init_opts.beepers[i].count;
                    }
                    world.beepers[init_opts.beepers[i].street]
                                 [init_opts.beepers[i].avenue] += count;

                    // TODO: error checking for out of range, bad count
                }
            }


            // set walls
            if (typeof init_opts.walls == 'object' && init_opts.walls.hasOwnProperty('length')) {
                for (i = 0, l = init_opts.walls.length; i < l; i++) {
                    if (typeof init_opts.walls[i].street != 'number' ||
                        typeof init_opts.walls[i].avenue != 'number') {
                        throw 'bad wall spec';
                    } 
                    st = init_opts.walls[i].street;
                    av = init_opts.walls[i].avenue;

                    if (st % 1 == .5) {
                        if (!isPositiveInteger(av)) {
                            throw 'bad avenue for wall';
                        }

                    } else if (av % 1 == .5) {
                        if (!isPositiveInteger(st)) {
                            throw 'bad street for wall';
                        }
                    } else {
                        throw 'bad street/avenue for wall';
                    }

                    world.walls.push( {street: st, avenue: av} );
                }
            }

        } else {
            throw 'bad opts';
        }

        // execution stuff
        world.execute = function (cmd) {
            if (cmd == 'move') {
                var next = nextAddress(world.robot.street, world.robot.avenue, world.robot.direction);

                if (checkMove(world.robot, next, world)) {
                    world.robot.street = next.street;
                    world.robot.avenue = next.avenue;
                } else {
                    throw 'can\'t move';
                }
            } else if (cmd == 'turnleft') {
                world.robot.direction = leftOf(world.robot.direction);
            } else if (cmd == 'putbeeper') {
                if (world.robot.beepers > 0) {
                    world.robot.beepers --;
                    world.beepers[world.robot.street][world.robot.avenue] ++;
                } else {
                    throw 'no beepers';
                }
            } else if (cmd == 'pickbeeper') {
                if (world.beepers[world.robot.street][world.robot.avenue] > 0) {
                    world.beepers[world.robot.street][world.robot.avenue] --;
                    world.robot.beepers ++;
                } else {
                    throw 'no beeper here';
                }
            } else if (cmd == 'turnoff') {
                world.done = true;
            } else {
                throw cmd + ' is not an instruction';
            }
        };

        world.testcond = function (cond) {
            var match, next, truth;
            if ((match = (/^(front|left|right)((-is-clear)|(-is-blocked))$/i).exec(cond)) !== null) {
                if (match[1] == 'front') {
                    next = nextAddress(world.robot.street, world.robot.avenue, world.robot.direction);
                } else if (match[1] == 'left') {
                    next = nextAddress(world.robot.street, world.robot.avenue, leftOf(world.robot.direction));
                } else if (match[1] == 'right') {
                    next = nextAddress(world.robot.street, world.robot.avenue, rightOf(world.robot.direction));
                }

                if (match[2] == '-is-clear') {
                    return checkMove(world.robot, next, world);
                } else {
                    return !checkMove(world.robot, next, world);
                }
            } else if ((match = (/^(not-)?facing-(north|south|east|west)$/i).exec(cond)) !== null) {
                truth = match[2].toUpperCase() == world.robot.direction;

                if (match[1]) {
                    return !truth;
                } else {
                    return truth;
                }
            } else if ((match = (/^(not-)?next-to-a-beeper$/i).exec(cond)) !== null) {
                truth = world.beepers[world.robot.street][world.robot.avenue] > 0;
                if (match[1]) {
                    return !truth;
                } else {
                    return truth;
                }
            } else if ((match = (/^(any|no)-beepers-in-beeper-bag$/i).exec(cond)) !== null) {
                truth = world.robot.beepers > 0;

                if (match[1] == 'no') {
                    return ! truth;
                } else {
                    return truth;
                }
            } else {
                throw 'unknown condition ' + cond;
            }
        };

        // set up canvas
        world.canvas.width = world.size.avenues * AVENUE_DIST_PX;
        world.canvas.height = world.size.streets * STREET_DIST_PX;
        world.context.width = world.canvas.width;
        world.context.height = world.canvas.height;

        world.draw = redraw_World;

        return world;
    };

    var parse =
    function(){
        var whitespace_regex = /\s+/g;
        var token_regex = /^([A-Za-z0-9-]+;?|;)$/;

        var tokenize = function (src) {
            var match, words, tokens = [];
            var prev;
            var i, l;

            words = src.split(whitespace_regex);

            for (i = 0, l = words.length; i < l; i++) {
                if (token_regex.test(words[i])) {

                    if (words[i].charAt(words[i].length - 1) == ';') {
                        if (words[i].length > 1) {
                            tokens.push(words[i].slice(0, -1));
                        }
                        tokens.push(';');
                    } else {
                        tokens.push(words[i]);
                    }
                } else if (words[i].length > 0) {
                    console.log('bad word ' + words[i]);
                }
            }

            return tokens;

        };

        var parse_program = function (tokens, symtab) {
            var i = {i: 0, sym: symtab};
            var o;

            if (!(/^BEGINNING-OF-PROGRAM$/i).test(tokens[i.i])) {
                throw 'parse error 1';
            }
            i.i++;

            o = {program: parse_top_stmts(tokens, i)};

            if (!(/^END-OF-PROGRAM$/i).test(tokens[i.i])) {
                throw 'parse error 2';
            }
            i.i++;

            if (i.i != tokens.length) {
                throw 'parse error 3';
            }

            return o;
        };

        var parse_top_stmts = function (tokens, i) {
            var o = {top_stmts: [ parse_top_stmt(tokens, i) ]};

            while (i.i < tokens.length && tokens[i.i] == ';') {
                i.i ++;

                o.top_stmts.push( parse_top_stmt(tokens, i) );
            }

            return o;
        };

        var parse_top_stmt = function (tokens, i) {
            var o, sym;
            if ((/^BEGINNING-OF-EXECUTION$/i).test(tokens[i.i])) {
                i.i ++;
                o = {exec: true, compound: parse_stmts(tokens, i)};

                if (!(/^END-OF-EXECUTION$/i).test(tokens[i.i])) {
                    throw 'parse error 4';
                }

                i.i ++;

            } else if((/^DEFINE-NEW-INSTRUCTION$/i).test(tokens[i.i])) {
                i.i ++;
                
                sym = tokens[i.i].toLowerCase();
                if (i.sym[sym]) {
                    throw sym + ' already defined';
                }

                i.sym[sym] = true;
                i.i ++;

                if (!(/^AS$/i).test(tokens[i.i])) {
                    throw 'expected AS';
                }
                i.i ++;

                o = {define: {name: sym, stmt: parse_stmt(tokens, i)}};
            } else {
                throw 'parse error 5';
            }

            return o;
        };

        var parse_stmts = function (tokens, i) {
            var o = {stmts: [ parse_stmt(tokens, i) ]};

            while (i.i < tokens.length && tokens[i.i] == ';') {
                i.i ++;

                o.stmts.push( parse_stmt(tokens, i) );
            }

            return o;
        };

        var parse_stmt = function (tokens, i) {
            var o;

            if ((/^BEGIN$/i).test(tokens[i.i])) {
                i.i ++;

                o = {compound: parse_stmts(tokens, i)};

                if (!(/^END$/i).test(tokens[i.i])) {
                    throw 'missing end';
                }
                i.i ++;
            } else if ((/^ITERATE$/i).test(tokens[i.i])) {
                i.i ++;

                if (!(/^[1-9][0-9]*$/).test(tokens[i.i])) {
                    throw 'expected positive integer';
                }

                o = {iter: parseInt(tokens[i.i], 10)};
                i.i ++;

                if (!(/^TIMES$/i).test(tokens[i.i])) {
                    throw 'expected TIMES';
                }
                i.i ++;

                o.stmt = parse_stmt(tokens, i);

            } else if ((/^IF$/i).test(tokens[i.i])) {
                i.i ++;

                if (!i.sym[tokens[i.i].toLowerCase()]) {
                    throw 'unknown symbol ' + tokens[i.i];
                }

                o = {cond: tokens[i.i]};
                i.i ++;

                if (!(/^THEN$/i).test(tokens[i.i])) {
                    throw 'exepected THEN';
                }
                i.i ++;

                o.if_stmt = parse_stmt(tokens, i);

                if (i.i < tokens.length && (/^ELSE$/i).test(tokens[i.i])) {
                    i.i ++;

                    o.else_stmt = parse_stmt(tokens, i);
                }

            } else if ((/^WHILE$/i).test(tokens[i.i])) {
                i.i ++;

                if (!i.sym[tokens[i.i].toLowerCase()]) {
                    throw 'unknown symbol ' + tokens[i.i];
                }

                o = {whilecond: tokens[i.i]};
                i.i ++;

                if (!(/^DO$/i).test(tokens[i.i])) {
                    throw 'expected DO';
                }
                i.i ++;

                o.stmt = parse_stmt(tokens, i);

            } else if (i.sym[tokens[i.i].toLowerCase()]) {
                o = {sym: tokens[i.i].toLowerCase()};
                i.i ++;
            } else {
                throw 'unknown symbol ' + tokens[i.i];
            }

            return o;
        };

        return function (src, symtab) {
            var tokens = tokenize(src);
            return parse_program(tokens, symtab);
        };
    }();

    var MAX_ITER = 1e6;

    var execute_compound = function (exec, defs, world) {
        var i;
        for (i = 0; i < exec.stmts.length; i++) {
            execute(exec.stmts[i], defs, world);
            if (world.done) return;
        }
    };

    var execute = function (stmt, defs, world) {
        var i;
        if (world.done) return;
        if (stmt.hasOwnProperty('sym')) {
            // invocation of an instruction
            if (defs.hasOwnProperty(stmt.sym)) {
                // user-defined
                execute(defs[stmt.sym], defs, world);
            } else {
                // assume it is builtin
                world.execute(stmt.sym);
            }
        } else if (stmt.hasOwnProperty('iter')) {
            for (var i = 0; i < stmt.iter; i++) {
                execute(stmt.stmt, defs, world);
                if (world.done) return;
            }
        } else if (stmt.hasOwnProperty('cond')) {
            if (world.testcond(stmt.cond)) {
                execute(stmt.if_stmt, defs, world);
            } else {
                if (stmt.hasOwnProperty('else_stmt')) {
                    execute(stmt.else_stmt, defs, world);
                }
            }
        } else if (stmt.hasOwnProperty('whilecond')) {
            i = 0;
            while (world.testcond(stmt.whilecond)) {
                if (i > MAX_ITER) {
                    throw 'ran too long';
                }
                i ++;

                execute(stmt.stmt, defs, world);
                if (world.done) return;
            }
        } else if (stmt.hasOwnProperty('compound')) {
            execute_compound(stmt.compound, defs, world);
        }
    };

    o.interpret = function (program, world) {
        var symtab = {
                move: true,
                turnleft: true,
                turnoff: true,
                pickbeeper: true,
                putbeeper: true,
                'front-is-clear': true,
                'left-is-clear': true,
                'right-is-clear': true,
                'front-is-blocked': true,
                'left-is-blocked': true,
                'right-is-blocked': true,
                'next-to-a-beeper': true,
                'not-next-to-a-beeper': true,
                'facing-north': true,
                'facing-south': true,
                'facing-east': true,
                'facing-west': true,
                'not-facing-north': true,
                'not-facing-south': true,
                'not-facing-east': true,
                'not-facing-west': true,
                'any-beepers-in-beeper-bag': true,
                'no-beepers-in-beeper-bag': true
            };
        var ast = parse(program, symtab);
        var top_stmts = ast.program.top_stmts;
        var exec = null;
        var i;
        var defs = {};

        for (i = 0; i < top_stmts.length; i++) {
            if (top_stmts[i].hasOwnProperty('exec')) {
                if (exec) {
                    throw 'multiple execution sections';
                }

                exec = top_stmts[i].compound;
            }

            if (top_stmts[i].hasOwnProperty('define')) {
                defs[top_stmts[i].define.name] = 
                    top_stmts[i].define.stmt;
            }
        }

        if (!exec) {
            throw 'no execution section';
        }

        execute_compound(exec, defs, world);

        if (!world.done) {
            throw 'missing turnoff';
        }
    };

    return o;
})();
