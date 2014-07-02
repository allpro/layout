/**
 * @preserve jquery.layout.state 1.0
 * $Date: 2011-07-16 08:00:00 (Sat, 16 July 2011) $
 *
 * Copyright (c) 2010 
 *   Kevin Dalman (http://allpro.net)
 *
 * Dual licensed under the GPL (http://www.gnu.org/licenses/gpl.html)
 * and MIT (http://www.opensource.org/licenses/mit-license.php) licenses.
 *
 * @dependancies: UI Layout 1.3.0.rc30.1 or higher
 * @dependancies: $.ui.cookie (above)
 *
 * @support: http://groups.google.com/group/jquery-ui-layout
 */
/*
 *	State-management options stored in options.stateManagement, which includes a .cookie hash
 *	Default options saves ALL KEYS for ALL PANES, ie: pane.size, pane.isClosed, pane.isHidden
 *
 *	// STATE/COOKIE OPTIONS
 *	@example $(el).layout({
				stateManagement: {
					enabled:	true
				,	stateKeys:	"east.size,west.size,east.isClosed,west.isClosed"
				,	cookie:		{ name: "appLayout", path: "/" }
				}
			})
 *	@example $(el).layout({ stateManagement__enabled: true }) // enable auto-state-management using cookies
 *	@example $(el).layout({ stateManagement__cookie: { name: "appLayout", path: "/" } })
 *	@example $(el).layout({ stateManagement__cookie__name: "appLayout", stateManagement__cookie__path: "/" })
 *
 *	// STATE/COOKIE METHODS
 *	@example myLayout.saveCookie( "west.isClosed,north.size,south.isHidden", {expires: 7} );
 *	@example myLayout.loadCookie();
 *	@example myLayout.deleteCookie();
 *	@example var JSON = myLayout.readState();	// CURRENT Layout State
 *	@example var JSON = myLayout.readCookie();	// SAVED Layout State (from cookie)
 *	@example var JSON = myLayout.state.stateData;	// LAST LOADED Layout State (cookie saved in layout.state hash)
 *
 *	CUSTOM STATE-MANAGEMENT (eg, saved in a database)
 *	@example var JSON = myLayout.readState( "west.isClosed,north.size,south.isHidden" );
 *	@example myLayout.loadState( JSON );
 */

// NOTE: For best readability, view with a fixed-width font and tabs equal to 4-chars

;(function ($) {

if (!$.layout) return;


/*
 *	GENERIC COOKIE/DATA MANAGEMENT
 *
 *	A $.cookie OR $.ui.cookie namespace *should be* standard.
 *	Until this is standard, I'll create my own $.ui.cookie methods!
 */
$.ui.cookie = {

	// TODO: is the cookieEnabled property fully cross-browser???
	acceptsCookies: !!navigator.cookieEnabled

,	read: function (name) {
		var
			c		= document.cookie
		,	cs		= c ? c.split(';') : []
		,	pair	// loop var
		;
		for (var i=0, n=cs.length; i < n; i++) {
			pair = $.trim(cs[i]).split('='); // name=value pair
			if (pair[0] == name) // found the layout cookie
				return decodeURIComponent(pair[1]);
		}
		return "";
	}

,	write: function (name, val, cookieOpts) {
		var
			params	= ''
		,	date	= ''
		,	clear	= false
		,	o		= cookieOpts || {}
		;
		if (!o.expires) ; // skip
		else if (o.expires.toUTCString)
			date = o.expires;
		else if (typeof o.expires == 'number') {
			date = new Date();
			if (o.expires > 0)
				date.setDate(date.getDate() + o.expires);
			else {
				date.setYear(1970);
				clear = true;
			}
		}
		if (date)		params += ';expires='+ date.toUTCString();
		if (o.path)		params += ';path='+ o.path;
		if (o.domain)	params += ';domain='+ o.domain;
		if (o.secure)	params += ';secure';
		document.cookie = name +'='+ (clear ? "" : encodeURIComponent( val )) + params; // write or clear cookie
	}

,	clear: function (name) {
		$.ui.cookie.write(name, '', {expires: -1});
	}

};


// tell Layout that the state plugin is available
$.layout.plugins.stateManagement = true;

//	Add State-Management options to layout.defaults
$.layout.defaults.stateManagement = {
	enabled:	false	// true = enable state-management, even if not using cookies
,	autoSave:	true	// Save a state-cookie when page exits?
,	autoLoad:	true	// Load the state-cookie when Layout inits?
	// List state-data to save - must be pane-specific
,	stateKeys:	"north.size,south.size,east.size,west.size,"+
				"north.isClosed,south.isClosed,east.isClosed,west.isClosed,"+
				"north.isHidden,south.isHidden,east.isHidden,west.isHidden"
,	cookie: {
		name:	""	// If not specified, will use Layout.name, else just "Layout"
	,	domain:	""	// blank = current domain
	,	path:	""	// blank = current page, '/' = entire website
	,	expires: ""	// 'days' to keep cookie - leave blank for 'session cookie'
	,	secure:	false
	}
};
// Set stateManagement as a layout-option, NOT a pane-option
$.layout.optionsMap.layout.push("stateManagement");

/*
 *	State Managment methods
 */
$.layout.state = {
	// set data used by multiple methods below
	config: {
		allPanes:	"north,south,west,east,center"
	}

	/**
	 * Get the current layout state and save it to a cookie
	 *
	 * myLayout.saveCookie( keys, cookieOpts )
	 *
	 * @param {Object}			inst
	 * @param {(string|Array)=}	keys
	 * @param {Object=}			opts
	 */
,	saveCookie: function (inst, keys, cookieOpts) {
		var o	= inst.options
		,	oS	= o.stateManagement
		,	oC	= $.extend( {}, oS.cookie, cookieOpts || {} )
		,	data = inst.state.stateData = inst.readState( keys || oS.stateKeys ) // read current panes-state
		;
		$.ui.cookie.write( oC.name || o.name || "Layout", $.layout.state.encodeJSON(data), oC );
		return $.extend( {}, data ); // return COPY of state.stateData data
	}

	/**
	 * Remove the state cookie
	 *
	 * @param {Object}	inst
	 */
,	deleteCookie: function (inst) {
		var o = inst.options;
		$.ui.cookie.clear( o.stateManagement.cookie.name || o.name || "Layout" );
	}

	/**
	 * Read & return data from the cookie - as JSON
	 *
	 * @param {Object}	inst
	 */
,	readCookie: function (inst) {
		var o = inst.options;
		var c = $.ui.cookie.read( o.stateManagement.cookie.name || o.name || "Layout" );
		// convert cookie string back to a hash and return it
		return c ? $.layout.state.decodeJSON(c) : {};
	}

	/**
	 * Get data from the cookie and USE IT to loadState
	 *
	 * @param {Object}	inst
	 */
,	loadCookie: function (inst) {
		var c = $.layout.state.readCookie(inst); // READ the cookie
		if (c) {
			inst.state.stateData = $.extend({}, c); // SET state.stateData
			inst.loadState(c); // LOAD the retrieved state
		}
		return c;
	}
	
	/**
	 * Update layout options from the cookie, if one exists
	 *
	 * @param {Object}		inst
	 * @param {Object=}		stateData
	 * @param {boolean=}	animate
	 */
,	loadState: function (inst, stateData, animate) {
		stateData = $.layout.transformData( stateData ); // panes = default subkey
		$.extend( true, inst.options, stateData ); // update layout options
		// if layout has already been initialized, then UPDATE layout state
		if (inst.state.initialized) {
			var pane, o, s, h, c
			,	noAnimate = (animate===false);
			$.each($.layout.state.config.allPanes.split(","), function (idx, pane) {
				o = stateData[ pane ];
				if (typeof o != 'object') return; // no key, continue
				s = o.size;
				c = o.initClosed;
				h = o.initHidden;
				if (s > 0 || s=="auto") inst.sizePane(pane, s, false, null, noAnimate); // will animate resize if option enabled
				if (h === true)			inst.hide(pane, a);
				else if (c === false)	inst.open (pane, false, noAnimate);
				else if (c === true)	inst.close(pane, false, noAnimate);
				else if (h === false)	inst.show (pane, false, noAnimate);
			});
		}
	}

	/**
	 * Get the *current layout state* and return it as a hash
	 *
	 * @param {Object=}			inst
	 * @param {(string|Array)=}	keys
	 */
,	readState: function (inst, keys) {
		var
			data	= {}
		,	alt		= { isClosed: 'initClosed', isHidden: 'initHidden' }
		,	state	= inst.state
		,	pair, pane, key, val
		;
		if (!keys) keys = inst.options.stateManagement.stateKeys; // if called by user
		if ($.isArray(keys)) keys = keys.join(",");
		// convert keys to an array and change delimiters from '__' to '.'
		keys = keys.replace(/__/g, ".").split(',');
		// loop keys and create a data hash
		for (var i=0, n=keys.length; i < n; i++) {
			pair = keys[i].split(".");
			pane = pair[0];
			key  = pair[1];
			if ($.layout.state.config.allPanes.indexOf(pane) < 0) continue; // bad pane!
			val = state[ pane ][ key ];
			if (val == undefined) continue;
			if (key=="isClosed" && state[pane]["isSliding"])
				val = true; // if sliding, then *really* isClosed
			( data[pane] || (data[pane]={}) )[ alt[key] ? alt[key] : key ] = val;
		}
		return data;
	}

	/**
	 *	Stringify a JSON hash so can save in a cookie or db-field
	 */
,	encodeJSON: function (JSON) {
		return parse(JSON);
		function parse (h) {
			var D=[], i=0, k, v, t; // k = key, v = value
			for (k in h) {
				v = h[k];
				t = typeof v;
				if (t == 'string')		// STRING - add quotes
					v = '"'+ v +'"';
				else if (t == 'object')	// SUB-KEY - recurse into it
					v = parse(v);
				D[i++] = '"'+ k +'":'+ v;
			}
			return '{'+ D.join(',') +'}';
		};
	}

	/**
	 *	Convert stringified JSON back to a hash object
	 *	@see		$.parseJSON(), adding in jQuery 1.4.1
	 */
,	decodeJSON: function (str) {
		try { return $.parseJSON ? $.parseJSON(str) : window["eval"]("("+ str +")") || {}; }
		catch (e) { return {}; }
	}


,	_create: function (inst) {
		//	ADD State-Management plugin methods to inst
		 $.extend( inst, {
		//	readCookie - update options from cookie - returns hash of cookie data
			readCookie:		function () { return $.layout.state.readCookie(inst); }
		//	deleteCookie
		,	deleteCookie:	function () { $.layout.state.deleteCookie(inst); }
		//	saveCookie - optionally pass keys-list and cookie-options (hash)
		,	saveCookie:		function (keys, cookieOpts) { return $.layout.state.saveCookie(inst, keys, cookieOpts); }
		//	loadCookie - readCookie and use to loadState() - returns hash of cookie data
		,	loadCookie:		function () { return $.layout.state.loadCookie(inst); }
		//	loadState - pass a hash of state to use to update options
		,	loadState:		function (stateData, animate) { $.layout.state.loadState(inst, stateData, animate); }
		//	readState - returns hash of current layout-state
		,	readState:		function (keys) { return $.layout.state.readState(inst, keys); }
		//	add JSON utility methods too...
		,	encodeJSON:		$.layout.state.encodeJSON
		,	decodeJSON:		$.layout.state.decodeJSON
		});

		// init state.stateData key, even if plugin is initially disabled
		inst.state.stateData = {};

		// read and load cookie-data per options
		var oS = inst.options.stateManagement;
		if (oS.enabled) {
			if (oS.autoLoad) // update the options from the cookie
				inst.loadCookie();
			else // don't modify options - just store cookie data in state.stateData
				inst.state.stateData = inst.readCookie();
		}
	}

,	_unload: function (inst) {
		var oS = inst.options.stateManagement;
		if (oS.enabled) {
			if (oS.autoSave) // save a state-cookie automatically
				inst.saveCookie();
			else // don't save a cookie, but do store state-data in state.stateData key
				inst.state.stateData = inst.readState();
		}
	}

};

// add state initialization method to Layout's onCreate array of functions
$.layout.onCreate.push( $.layout.state._create );
$.layout.onUnload.push( $.layout.state._unload );

})( jQuery );