/**
 *	debugData
 *
 *	Pass me a data structure {} and I'll output all the key/value pairs - recursively
 *
 *	@example var HTML = debugData( oElem.style, "Element.style", { keys: "top,left,width,height", recurse: true, sort: true, display: true, returnHTML: true });	
 *
 *	@param Object	o_Data   A JSON-style data structure
 *	@param String	s_Title  Title for dialog (optional)
 *	@param Hash	options  Pass additional options in a hash
 */
function debugData (o_Data, s_Title, options) {
	options = options || {};
	var
		str=(s_Title||s_Title==='' ? s_Title : 'DATA')
	,	dType=$.type(o_Data)
	//	maintain backward compatibility with OLD 'recurseData' param
	,	recurse=($.type(options)==='boolean' ? options : options.recurse !==false)
	,	keys=(options.keys?','+options.keys+',':false)
	,	display=options.display !==false
	,	html=options.returnHTML !==false
	,	sort=!!options.sort
	,	prefix=options.indent ? '    ' : ''
	,	D=[], i=0 // Array to hold data, i=counter
	,	hasSubKeys = false
	,	k, t, skip, x, type	// loop vars
	;
	if (dType!=='object' && dType!=='array') {
		if (options.display) alert( (s_Title || 'debugData') +': '+ o_Data );
		return o_Data;
	}
	if (dType==='object' && $.isPlainObject(o_Data))
		dType='hash';

	if (o_Data.jquery) {
		str=s_Title+'jQuery Collection ('+ o_Data.length +')\n    context="'+ o_Data.context +'"';
	}
	else if (o_Data.nodeName) {
		str=s_Title+o_Data.tagName;
		var id = o_Data.id, cls=o_Data.className, src=o_Data.src, hrf=o_Data.href;
		if (id)  str+='\n    id="'+		id+'"';
		if (cls) str+='\n    class="'+	cls+'"';
		if (src) str+='\n    src="'+	src+'"';
		if (hrf) str+='\n    href="'+	hrf+'"';
	}
	else {
		parse(o_Data,prefix,dType); // recursive parsing
		if (sort && !hasSubKeys) D.sort(); // sort by keyName - but NOT if has subKeys!
		if (str) str += '\n***'+ '****************************'.substr(0,str.length) +'\n';
		str += D.join('\n'); // add line-breaks
	}

	if (display) alert(str); // display data
	if (html) str=str.replace(/\n/g, ' <br>').replace(/  /g, ' &nbsp;'); // format as HTML
	return str;

	function parse ( data, prefix, parentType ) {
		var first = true;
		try {
			$.each( data, function (key, val) {
				skip = (keys && keys.indexOf(','+key+',') === -1);
				type = $.type(val);
				if (type==='object' && $.isPlainObject(val))
					type = 'hash';
				k = prefix + (first ? '    ' : ',   ');
				first = false;

				if (parentType!=='array') // no key-names for array items
					k += key+':  '; // NOT an array

				if (type==="date" || type==="regexp") {
					val  = val.toString();
					type = "string";
				}
				if (type==="string") {				// STRING
					if (!skip) D[i++] = k +'"'+ val +'"';
				}
													// NULL, UNDEFINED, NUMBER or BOOLEAN
				else if (/^(null|undefined|number|boolean)/.test(type)) {
					if (!skip) D[i++] = k + val;
				}
				else if (type==="function") {		// FUNCTION
					if (!skip) D[i++] = k +'function()';
				}
				else if (type==="array") {			// ARRAY
					if (!skip) {
						D[i++] = k +'[';
						parse( val, prefix+'    ',type); // RECURSE
						D[i++] = prefix +'    ]';
					}
				}
				else if (val.jquery) {				// JQUERY OBJECT
					if (!skip) D[i++] = k +'jQuery ('+ val.length +') context="'+ val.context +'"';
				}
				else if (val.nodeName) {			// DOM ELEMENT
					var id = val.id, cls=val.className, src=val.src, hrf=val.href;
					if (skip) D[i++] = k +' '+
						id  ? 'id="'+	id+'"' :
						src ? 'src="'+	src+'"' :
						hrf ? 'href="'+	hrf+'"' :
						cls ? 'class="'+cls+'"' :
						'';
				}
				else if (type==="hash") {			// JSON
					if (!recurse || $.isEmptyObject(val)) { // show an empty hash
						if (!skip) D[i++] = k +'{ }';
					}
					else { // recurse into JSON hash - indent output
						D[i++] = k +'{';
						parse( val, prefix+'    ',type); // RECURSE
						D[i++] = prefix +'    }';
					}
				}
				else {								// OBJECT
					if (!skip) D[i++] = k +'OBJECT'; // NOT a hash
				}
			});
		} catch (e) {}
	}
};

function debugStackTrace (s_Title, options) {
	var
		callstack = []
	,	isCallstackPopulated = false
	;
	try {
		i.dont.exist += 0; // doesn't exist- that's the point
	} catch(e) {
		if (e.stack) { // Firefox
			var lines = e.stack.split('\n');
			for (var i=0, len=lines.length; i<len; i++) {
				if (lines[i].match(/^\s*[A-Za-z0-9\-_\$]+\(/)) {
					callstack.push(lines[i]);
				}
			}
			//Remove call to printStackTrace()
			callstack.shift();
			isCallstackPopulated = true;
		}
		else if (window.opera && e.message) { // Opera
			var lines = e.message.split('\n');
			for (var i=0, len=lines.length; i<len; i++) {
				if (lines[i].match(/^\s*[A-Za-z0-9\-_\$]+\(/)) {
					var entry = lines[i];
					//Append next line also since it has the file info
					if (lines[i+1]) {
						entry += ' at ' + lines[i+1];
						i++;
					}
					callstack.push(entry);
				}
			}
			//Remove call to printStackTrace()
			callstack.shift();
			isCallstackPopulated = true;
		}
	}

	if (!isCallstackPopulated) { // IE and Safari
		var currentFunction = arguments.callee.caller;
		while (currentFunction) {
			var fn = currentFunction.toString();
			var fname = fn.substring(fn.indexOf('function') + 8, fn.indexOf('')) || 'anonymous';
			callstack.push(fname);
			currentFunction = currentFunction.caller;
		}
	}

	debugData( callstack, s_Title, options );
};

if (!window.console) window.console = { log: debugData };

if (!window.console.trace)
	window.console.trace  = function (s_Title) {
		window.console.log( debugStackTrace(s_Title, { display: false, returnHTML: false, sort: false }) );
	};

// add method to output 'hash data' inside an string
window.console.data = function (data, title) {
	var	w		= { array: ['[',']'], object: ['{','}'], string: ['"','"'], number: ['',''], function: ['','()'] }
	,	x		= $.type( data )
	,	obj		= x.match(/(object|array)/)
	,	delim	= !obj ? ['',''] : x === 'object' ? ['{\n','\n}'] : ['[\n','\n]']
	,	opts	= { display: false, returnHTML: false, sort: false }
	,	debug	= debugData( data, '', opts)
	;
	console.log(
		(title ? title +' = ' : '')
	+	delim[0]
	+	($.type(debug) === 'string' ? debug.replace(/    /g, '\t') : debug)
	+	delim[1]
	);
};


/**
 *	timer
 *
 *	Utility for debug timing of events
 *	Can track multiple timers and returns either a total time or interval from last event
 *	@param String	timerName	Name of the timer - defaults to debugTimer
 *	@param String	action		Keyword for action or return-value...
 *	action: 'reset' = reset; 'clear' = delete; 'total' = ms since init; 'step' or '' = ms since last event
 */
/**
 *	timer
 *
 *	Utility method for timing performance
 *	Can track multiple timers and returns either a total time or interval from last event
 *
 *	returns time-data: {
 *		start:	Date Object
 *	,	last:	Date Object
 * 	,	step:	99 // time since 'last'
 *	,	total:	99 // time since 'start'
 *	}
 *
 *	USAGE SAMPLES
 *	=============
 *	timer('name'); // create/init timer
 *	timer('name', 'reset'); // re-init timer
 *	timer('name', 'clear'); // clear/remove timer
 *	var i = timer('name');  // how long since last timer request?
 *	var i = timer('name', 'total'); // how long since timer started?
 *
 *	@param String	timerName	Name of the timer - defaults to debugTimer
 *	@param String	action		Keyword for action or return-value...
 *	@param Hash		options		Options to customize return data
 *	action: 'reset' = reset; 'clear' = delete; 'total' = ms since init; 'step' or '' = ms since last event
 */
function timer (timerName, action, options) {
	var
		name	= timerName || 'debugTimer'
	,	Timer	= window[ name ]
	,	defaults = {
			returnString:	true
		,	padNumbers:		true
		,	timePrefix:		''
		,	timeSuffix:		''
		}
	;

	// init the timer first time called
	if (!Timer || action == 'reset') { // init timer
		Timer = window[ name ] = {
			start:	new Date()
		,	last:	new Date()
		,	step:	0 // time since 'last'
		,	total:	0 // time since 'start'
		,	options: $.extend({}, defaults, options)
		};
	}
	else if (action == 'clear') { // remove timer
		window[ name ] = null;
		return null;
	}
	else { // update existing timer
		Timer.step	= (new Date()) - Timer.last;  // time since 'last'
		Timer.total	= (new Date()) - Timer.start; // time since 'start'
		Timer.last	= new Date();
	}

	var
		time = (action == 'total') ? Timer.total : Timer.step
	,	o = Timer.options // alias
	;

	if (o.returnString) {
		time += ""; // convert integer to string
		// pad time to 4 chars with underscores
		if (o.padNumbers)
			switch (time.length) {
				case 1:	time = "&ensp;&ensp;&ensp;"+ time;	break;
				case 2:	time = "&ensp;&ensp;"+ time;	break;
				case 3:	time = "&ensp;"+ time;	break;
			}
		// add prefix and suffix
		if (o.timePrefix || o.timeSuffix)
			time = o.timePrefix + time + o.timeSuffix;
	}

	return time;
};


/**
 *	showOptions
 *
 *	Pass a layout-options object, and the pane/key you want to display
 */
function showOptions (Layout, key, debugOpts) {
	var data = Layout.options;
	$.each(key.split("."), function() {
		data = data[this]; // recurse through multiple key-levels
	});
	debugData( data, 'options.'+key, debugOpts );
};

/**
 *	showState
 *
 *	Pass a layout-options object, and the pane/key you want to display
 */
function showState (Layout, key, debugOpts) {
	var data = Layout.state;
	$.each(key.split("."), function() {
		data = data[this]; // recurse through multiple key-levels
	});
	debugData( data, 'state.'+key, debugOpts );
};




function debugWindow ( content, options ) {
	var defaults = {
		css: {
			position:	'fixed'
		,	top:		0
		}
	};
	$.extend( true, (options || {}), defaults );
	var $W	= $('<div></div>')
		.html( content.replace(/\n/g, '<br>').replace(/  /g, ' &nbsp;') ) // format as HTML
		.css( options.css )
		;
};

