function View( props ){
	this.renderer = a7.model.get("a7.ui").renderer;
	this.type = 'View';
	this.props = props;
	this.state = {};

	this.config();
}

View.prototype = {
	config: function(){

		this.on( "mustRegister", function( parent ){
			this.props.parentID = parent.props.id;
			a7.ui.register( this );
		}.bind( this ) );

		this.on( "mustRender", function(){
			// only render root views from here, children will be rendered by parents through bubbling of events
			if( this.props.parentID === undefined ){
				this.render();
			}
		}.bind( this ));

		this.on( "rendered", function(){
			this.onRendered();
		}.bind( this ));

		this.on( "registered", function(){
			// register children
			if( this.props !== undefined ){
				for( var prop in this.props ){
					if( this.props[ prop ] !== null && this.props[ prop ].type !== undefined && this.props[ prop ].type === "View" ){
						if( a7.ui.getView( this.props[ prop ].props.id ) === undefined ){
							this.props[ prop ].fireEvent( "mustRegister", this);
						}
					}
				}
			}
			if( this.props.parentID === undefined ){
				// only fire render event for root views, children will render in the chain
				this.fireEvent( "mustRender" );
			}
		}.bind( this ));

		// bubble up event
		if( this.props !== undefined ){
			for( var prop in this.props ){
				if( this.props[ prop ].type !== undefined && this.props[ prop ].type === 'View' ){
					this.props[ prop ].on( "mustRender", function(){
						this.fireEvent( "mustRender" );
					}.bind( this ));
				}
			}
		}
	},
	events : ['mustRender','rendered', 'mustRegister', 'initialRender', 'registered'],
  setState: function( args ){
    this.state = args;
    // setting state requires a re-render
		this.fireEvent( 'mustRender' );
  },
  render: function(){
		if( this.props.element === undefined || this.props.element === null ){
			this.props.element = document.querySelector( this.props.selector );
		}
		if( !this.props.element ) throw( "You must define a selector for the view." );
    this.props.element.innerHTML = ( typeof this.template == "function" ? this.template() : this.template );

		var eventArr = [];
		a7.ui.getEvents().forEach( function( eve ){
			eventArr.push("[data-on" + eve + "]");
		});
		var eles = this.props.element.querySelectorAll( eventArr.toString() );

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
	onRendered: function(){
		if( this.props !== undefined ){
			for( var prop in this.props ){
				if( this.props[ prop ].type !== undefined && this.props[ prop ].type === "View" ){
					this.props[ prop ].props.element = document.querySelector( this.props[ prop ].props.selector );
					this.props[ prop ].render();
				}
			}
		}
	}
};
