/**
 * @preserve jquery.layout.state 1.2
 * $Date: 2011-07-16 08:00:00 (Sat, 16 July 2011) $
 *
 * Copyright (c) 2010 
 *   Kevin Dalman (http://allpro.net)
 *
 * Dual licensed under the GPL (http://www.gnu.org/licenses/gpl.html)
 * and MIT (http://www.opensource.org/licenses/mit-license.php) licenses.
 *
 *	@dependancies: $.layout 1.3.0.rc30 or higher
 *
 * Docs: [ to come ]
 * Tips: [ to come ]
 * Help: http://groups.google.com/group/jquery-ui-layout
 */

// NOTE: For best readability, view with a fixed-width font and tabs equal to 4-chars

;(function ($) {

if (!$.layout) return;


// tell Layout that the state plugin is available
$.layout.plugins.touch = true;

/*
 *	State Managment methods
 */
$.layout.touch = {
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
		// if browser is not Touch enabled, then exit
		if (!window.Touch) return; // check for IOS
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

,	bindEvents: function (inst) {
		inst.resizers.each(function(){
			if (this !== false) this
				.bind('touchstart',	function (evt) { return $.layout.touch.start(evt, inst); }); 
				.bind('touchmove',	function (evt) { return $.layout.touch.move(evt, inst); }); 
				.bind('touchend',	function (evt) { return $.layout.touch.end(evt, inst); }); 
		});
	}

,	start: function (evt, inst) {
		var	$R		= $(this)
		,	p	= $R.data('layoutEdge')
		,	o		= inst.options[p]
		,	s		= inst.options[p]
		;
		s.touchDragStart = 0;
		if (s.isClosed || !o.resizable) return; 
		// Touch: ignore all but single touch events 
		var e = evt.originalEvent;
		if (!e.touches || e.touches.length != 1) return; 
		// SET RESIZER LIMITS - used in drag() 
		setSizeLimits(p); // update pane/resizer state 
		r = s.resizerPosition; 
		s.isResizing = true; 
	}

,	move: function (evt, inst) {
		var	$R	= $(this)
		,	p	= $R.data('layoutEdge')
		,	o	= inst.options[p]
		,	s	= inst.options[p]
		,	e	= evt.originalEvent
		,	t	= e.touches
		,	vert = p.test(/(east|west)/)
		;
		if (s.isClosed || !o.resizable) return; 
		if (!t || t.length != 1) return; 
		e.preventDefault();  // Touch: prevent scrolling 
		pos = vert ? t[0].pageX : t[0].pageY; 
		pos = Math.min( Math.max(pos, r.min), r.max );
		// Touch: for simplicity, move the actual resizer div, not a clone 
		$R.css((vert ? 'left' : 'top'), pos); 
		s.touchDragStart = pos;
	}

,	end: function (evt, inst) {
		var	$R	= $(this)
		,	p	= $R.data('layoutEdge')
		,	o	= inst.options[p]
		,	s	= inst.options[p]
		,	e	= evt.originalEvent
		,	t	= e.touches
		,	pos	= s.touchDragStart; 
		,	vert = p.test(/(east|west)/)
		;
		s.touchDragStart = 0;
		if (s.isClosed || !o.resizable) return; 
		if (!pos) return;
		var c   = _c[pane], resizerPos; 
		// Touch: reset the resizer's top/left style that we set above during drag, 
		// else it remains stuck in place if the pane is later closed 
		$R.css((vert ? 'left' : 'top'), ''); 
		// Touch: following code inspired by resizePanes() subroutine 
		switch (pane) { 
				case "north": resizerPos = dragpos; break; 
				case "west":  resizerPos = dragpos;  break; 
				case "south": resizerPos = sC.offsetHeight - dragpos - o.spacing_open; break; 
				case "east":  resizerPos = sC.offsetWidth  - dragpos - o.spacing_open; break; 
		}; 
		// remove container margin from resizer position to get the pane size 
		var newSize = resizerPos - sC["inset"+ c.side]; 
		manualSizePane(pane, newSize); 
		s.isResizing = false; 
	}

,	_load: function (inst) {
		//	ADD State-Management plugin methods to inst
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




// add state initialization method to Layout's onCreate array of functions
$.layout.onCreate.push( $.layout.buttons._load );
$.layout.onUnload.push( $.layout.buttons._unload );

})( jQuery );