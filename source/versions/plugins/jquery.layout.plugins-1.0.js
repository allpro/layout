;(function ($) {

// jquery.layout.js MUST load first
if (!$.layout) return;

// NOTE: For best readability, view with a fixed-width font and tabs equal to 4-chars


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

/**
 *	UI COOKIE UTILITY
 *
 *	A $.cookie OR $.ui.cookie namespace *should be standard*, but until then...
 *	This creates $.ui.cookie so Layout does not need the cookie.jquery.js plugin
 *	NOTE: This utility is REQUIRED by the layout.state plugin
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
		if (!o.expires) {} // skip
		else if (o.expires.toUTCString)
			date = o.expires;
		else if (typeof o.expires == 'number') {
			date = new Date();
			if (o.expires > 0)
				date.setDate(date.getDate() + o.expires);
			else {
				date.setFullYear(1970);
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
// Cookie methods in Layout are part of State Managment 


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




/**
 * @preserve jquery.layout.buttons 1.0
 * $Date: 2011-07-16 08:00:00 (Sat, 16 July 2011) $
 *
 * Copyright (c) 2010 
 *   Kevin Dalman (http://allpro.net)
 *
 * Dual licensed under the GPL (http://www.gnu.org/licenses/gpl.html)
 * and MIT (http://www.opensource.org/licenses/mit-license.php) licenses.
 *
 * @dependancies: UI Layout 1.3.0.rc30.1 or higher
 *
 * @support: http://groups.google.com/group/jquery-ui-layout
 *
 * Docs: [ to come ]
 * Tips: [ to come ]
 */

// tell Layout that the state plugin is available
$.layout.plugins.buttons = true;

//	Add buttons options to layout.defaults
$.layout.defaults.autoBindCustomButtons = false;
// Specify autoBindCustomButtons as a layout-option, NOT a pane-option
$.layout.optionsMap.layout.push("autoBindCustomButtons");

/*
 *	Button methods
 */
$.layout.buttons = {
	// set data used by multiple methods below
	config: {
		borderPanes:	"north,south,west,east"
	}

	/**
	* Searches for .ui-layout-button-xxx elements and auto-binds them as layout-buttons
	*
	* @see  _create()
	*/
,	init: function (inst) {
		var pre		= "ui-layout-button-"
		,	layout	= inst.options.name || ""
		,	name;
		$.each("toggle,open,close,pin,toggle-slide,open-slide".split(","), function (i, action) {
			$.each($.layout.buttons.config.borderPanes.split(","), function (ii, pane) {
				$("."+pre+action+"-"+pane).each(function(){
					// if button was previously 'bound', data.layoutName was set, but is blank if layout has no 'name'
					name = $(this).data("layoutName") || $(this).attr("layoutName");
					if (name == undefined || name === layout)
						inst.bindButton(this, action, pane);
				});
			});
		});
	}

	/**
	* Helper function to validate params received by addButton utilities
	*
	* Two classes are added to the element, based on the buttonClass...
	* The type of button is appended to create the 2nd className:
	*  - ui-layout-button-pin
	*  - ui-layout-pane-button-toggle
	*  - ui-layout-pane-button-open
	*  - ui-layout-pane-button-close
	*
	* @param  {(string|!Object)}	selector	jQuery selector (or element) for button, eg: ".ui-layout-north .toggle-button"
	* @param  {string}   			pane 		Name of the pane the button is for: 'north', 'south', etc.
	* @return {Array.<Object>}		If both params valid, the element matching 'selector' in a jQuery wrapper - otherwise returns null
	*/
,	get: function (inst, selector, pane, action) {
		var $E	= $(selector)
		,	o	= inst.options
		,	err	= o.showErrorMessages
		,	lang= $.layout.language
		;
		if (!$E.length) { // element not found
			if (err) alert(lang.errButton + lang.selector +": "+ selector);
		}
		else if ($.layout.buttons.config.borderPanes.indexOf(pane) === -1) { // invalid 'pane' sepecified
			if (err) alert(lang.errButton + lang.pane +": "+ pane);
			$E = $("");  // NO BUTTON
		}
		else { // VALID
			var btn = o[pane].buttonClass +"-"+ action;
			$E	.addClass( btn +" "+ btn +"-"+ pane )
				.data("layoutName", o.name); // add layout identifier - even if blank!
		}
		return $E;
	}


	/**
	* NEW syntax for binding layout-buttons - will eventually replace addToggle, addOpen, etc.
	*
	* @param {(string|!Object)}	sel		jQuery selector (or element) for button, eg: ".ui-layout-north .toggle-button"
	* @param {string}			action
	* @param {string}			pane
	*/
,	bind: function (inst, sel, action, pane) {
		var _ = $.layout.buttons;
		switch (action.toLowerCase()) {
			case "toggle":			_.addToggle	(inst, sel, pane); break;	
			case "open":			_.addOpen	(inst, sel, pane); break;
			case "close":			_.addClose	(inst, sel, pane); break;
			case "pin":				_.addPin	(inst, sel, pane); break;
			case "toggle-slide":	_.addToggle	(inst, sel, pane, true); break;	
			case "open-slide":		_.addOpen	(inst, sel, pane, true); break;
		}
		return inst;
	}

	/**
	* Add a custom Toggler button for a pane
	*
	* @param {(string|!Object)}	selector	jQuery selector (or element) for button, eg: ".ui-layout-north .toggle-button"
	* @param {string}  			pane 		Name of the pane the button is for: 'north', 'south', etc.
	* @param {boolean=}			slide 		true = slide-open, false = pin-open
	*/
,	addToggle: function (inst, selector, pane, slide) {
		$.layout.buttons.get(inst, selector, pane, "toggle")
			.click(function(evt){
				inst.toggle(pane, !!slide);
				evt.stopPropagation();
			});
		return inst;
	}

	/**
	* Add a custom Open button for a pane
	*
	* @param {(string|!Object)}	selector	jQuery selector (or element) for button, eg: ".ui-layout-north .toggle-button"
	* @param {string}			pane 		Name of the pane the button is for: 'north', 'south', etc.
	* @param {boolean=}			slide 		true = slide-open, false = pin-open
	*/
,	addOpen: function (inst, selector, pane, slide) {
		$.layout.buttons.get(inst, selector, pane, "open")
			.attr("title", $.layout.language.Open)
			.click(function (evt) {
				inst.open(pane, !!slide);
				evt.stopPropagation();
			});
		return inst;
	}

	/**
	* Add a custom Close button for a pane
	*
	* @param {(string|!Object)}	selector	jQuery selector (or element) for button, eg: ".ui-layout-north .toggle-button"
	* @param {string}   		pane 		Name of the pane the button is for: 'north', 'south', etc.
	*/
,	addClose: function (inst, selector, pane) {
		$.layout.buttons.get(inst, selector, pane, "close")
			.attr("title", $.layout.language.Close)
			.click(function (evt) {
				inst.close(pane);
				evt.stopPropagation();
			});
		return inst;
	}

	/**
	* Add a custom Pin button for a pane
	*
	* Four classes are added to the element, based on the paneClass for the associated pane...
	* Assuming the default paneClass and the pin is 'up', these classes are added for a west-pane pin:
	*  - ui-layout-pane-pin
	*  - ui-layout-pane-west-pin
	*  - ui-layout-pane-pin-up
	*  - ui-layout-pane-west-pin-up
	*
	* @param {(string|!Object)}	selector	jQuery selector (or element) for button, eg: ".ui-layout-north .toggle-button"
	* @param {string}   		pane 		Name of the pane the pin is for: 'north', 'south', etc.
	*/
,	addPin: function (inst, selector, pane) {
		var $E = $.layout.buttons.get(inst, selector, pane, "pin");
		if ($E.length) {
			var s = inst.state[pane];
			$E.click(function (evt) {
				$.layout.buttons.setPinState(inst, $(this), pane, (s.isSliding || s.isClosed));
				if (s.isSliding || s.isClosed) inst.open( pane ); // change from sliding to open
				else inst.close( pane ); // slide-closed
				evt.stopPropagation();
			});
			// add up/down pin attributes and classes
			$.layout.buttons.setPinState(inst, $E, pane, (!s.isClosed && !s.isSliding));
			// add this pin to the pane data so we can 'sync it' automatically
			// PANE.pins key is an array so we can store multiple pins for each pane
			s.pins.push( selector ); // just save the selector string
		}
		return inst;
	}

	/**
	* Change the class of the pin button to make it look 'up' or 'down'
	*
	* @see  addPin(), syncPins()
	* @param {Array.<Object>}	$Pin	The pin-span element in a jQuery wrapper
	* @param {string}	pane	These are the params returned to callbacks by layout()
	* @param {boolean}	doPin	true = set the pin 'down', false = set it 'up'
	*/
,	setPinState: function (inst, $Pin, pane, doPin) {
		var updown = $Pin.attr("pin");
		if (updown && doPin === (updown=="down")) return; // already in correct state
		var
			pin		= inst.options[pane].buttonClass +"-pin"
		,	side	= pin +"-"+ pane
		,	UP		= pin +"-up "+	side +"-up"
		,	DN		= pin +"-down "+side +"-down"
		,	lang	= $.layout.language
		;
		$Pin
			.attr("pin", doPin ? "down" : "up") // logic
			.attr("title", doPin ? lang.Unpin : lang.Pin)
			.removeClass( doPin ? UP : DN ) 
			.addClass( doPin ? DN : UP ) 
		;
	}

	/**
	* INTERNAL function to sync 'pin buttons' when pane is opened or closed
	* Unpinned means the pane is 'sliding' - ie, over-top of the adjacent panes
	*
	* @see  open(), close()
	* @param {string}	pane   These are the params returned to callbacks by layout()
	* @param {boolean}	doPin  True means set the pin 'down', False means 'up'
	*/
,	syncPinBtns: function (inst, pane, doPin) {
		// REAL METHOD IS _INSIDE_ LAYOUT - THIS IS HERE JUST FOR REFERENCE
		$.each(state[pane].pins, function (i, selector) {
			$.layout.buttons.setPinState(inst, $(selector), pane, doPin);
		});
	}


,	_load: function (inst) {
		//	ADD Button methods to Layout Instance
		$.extend( inst, {
			bindButton:		function (selector, action, pane) { return $.layout.buttons.bind(inst, selector, action, pane); }
		//	DEPRECATED METHODS...
		,	addToggleBtn:	function (selector, pane, slide) { return $.layout.buttons.addToggle(inst, selector, pane, slide); }
		,	addOpenBtn:		function (selector, pane, slide) { return $.layout.buttons.addOpen(inst, selector, pane, slide); }
		,	addCloseBtn:	function (selector, pane) { return $.layout.buttons.addClose(inst, selector, pane); }
		,	addPinBtn:		function (selector, pane) { return $.layout.buttons.addPin(inst, selector, pane); }
		});

		// init state array to hold pin-buttons
		for (var i=0; i<4; i++) {
			var pane = $.layout.buttons.config.borderPanes[i];
			inst.state[pane].pins = [];
		}

		// auto-init buttons onLoad if option is enabled
		if ( inst.options.autoBindCustomButtons )
			$.layout.buttons.init(inst);
	}

,	_unload: function (inst) {
		// TODO: unbind all buttons???
	}

};
// add initialization method to Layout's onLoad array of functions
$.layout.onLoad.push(  $.layout.buttons._load );
//$.layout.onUnload.push( $.layout.buttons._unload );


})( jQuery );