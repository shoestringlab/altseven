function View( props ){
	this.renderer = a7.model.get("a7").ui.renderer;
	this.type = 'View';
	this.timeout;
	this.timer;
	this.element; // html element the view renders into
	this.props = props;
	this.isTransient = props.isTransient || false;
	this.state = {};
	this.skipRender = false;
	this.children = {}; // child views
	this.components = {}; // register objects external to the framework so we can address them later
	this.config();
	this.fireEvent( "mustRegister" );
}

View.prototype = {
	config: function(){

		this.on( "mustRegister", function(){
			a7.log.trace( 'mustRegister: ' + this.props.id );
			a7.ui.register( this );
			if( a7.ui.getView( this.props.parentID ) ){
				a7.ui.getView( this.props.parentID ).addChild( this );
			}
		}.bind( this ) );

		this.on( "mustRender", function(){
			a7.log.trace( 'mustRender: ' + this.props.id );
			if( this.shouldRender() ){
				a7.ui.enqueueForRender( this.props.id );
			}else{
				a7.log.trace( 'Render cancelled: ' + this.props.id );
				// undo skip, it must be explicitly set each time
				this.skipRender = false;
			}
		}.bind( this ));

		this.on( "rendered", function(){
			if( this.isTransient ){
				// set the timeout
				if( this.timer !== undefined ){
					clearTimeout( this.timer );
				}
				this.timer = setTimeout( this.checkRenderStatus.bind( this ), a7.model.get( "a7" ).ui.timeout );
			}
			this.onRendered();
		}.bind( this ));

		this.on( "registered", function(){
			if( this.props.parentID === undefined || this.mustRender ){
				// only fire render event for root views, children will render in the chain
				this.fireEvent( "mustRender" );
			}
		}.bind( this ));

		this.on( "mustUnregister", function(){
			a7.ui.unregister( this.props.id );
		}.bind( this ));
	},
	events : ['mustRender','rendered', 'mustRegister', 'registered', 'mustUnregister'],
  setState: function( args ){
    this.state = args;
    // setting state requires a re-render
		this.fireEvent( 'mustRender' );
	},
	getState: function(){
		return Object.assign( this.state );
	},
	addChild: function( view ){
		this.children[ view.props.id ] = view;
		// force a render for children added
		//this.children[ view.props.id ].mustRender = true;
	},
	removeChild: function( view ){
		delete this.children[ view.props.id ];
	},
	clearChildren: function(){
		this.children = {};
	},
	getParent: function(){
		return ( this.props.parentID ? a7.ui.getView( this.props.parentID ) : undefined );
	},
	render: function(){
		a7.log.info( 'render: ' + this.props.id );
		if( this.element === undefined || this.element === null ){
			this.element = document.querySelector( this.props.selector );
		}
		if( !this.element ){
			a7.log.error( "The DOM element for view " + this.props.id + " was not found. The view will be removed and unregistered." );
			// if the component has a parent, remove the component from the parent's children
			if( this.props.parentID !== undefined ){
				a7.ui.getView( this.props.parentID ).removeChild( this );
			}
			// if the selector isn't in the DOM, skip rendering and unregister the view
			this.fireEvent( 'mustUnregister' );
			return;
		}
		//throw( "You must define a selector for the view." );
		this.element.innerHTML = ( typeof this.template == "function" ? this.template() : this.template );

		var eventArr = [];
		a7.ui.getEvents().forEach( function( eve ){
			eventArr.push("[data-on" + eve + "]");
		});
		var eles = this.element.querySelectorAll( eventArr.toString() );

		eles.forEach( function( sel ){
			for( var ix=0; ix < sel.attributes.length; ix++ ){
				var attribute = sel.attributes[ix];
				if( attribute.name.startsWith( "data-on" ) ){
					var event = attribute.name.substring( 7, attribute.name.length );
					sel.addEventListener( event, this.eventHandlers[ sel.attributes["data-on" + event].value ] );
				}
			}
		}.bind( this ));

		this.fireEvent( "rendered" );
	},
	shouldRender: function(){
    if( this.skipRender ){
      return false;
    }else{
      return true;
    }
	},
	// after rendering, render all the children of the view
	onRendered: function(){
		for( var child in this.children ){
			this.children[ child ].element = document.querySelector( this.children[ child ].props.selector );
			this.children[ child ].render();
		}
	},
	// need to add props.isTransient (default false) to make views permanent by default
	checkRenderStatus: function(){
		if( document.querySelector( this.props.selector ) === null ){
			a7.ui.unregister( this.id );
		}else{
			if( this.isTransient ){
				this.timer = setTimeout( this.checkRenderStatus.bind( this ), a7.model.get( "a7" ).ui.timeout );
			}
		}
	}
};
