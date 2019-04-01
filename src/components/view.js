function View( props ){
	this.renderer = a7.model.get("a7").ui.renderer;
	this.type = 'View';
	this.props = props;
	this.state = {};
	this.mustRender = false;
	this.config();
}

View.prototype = {
	config: function(){

		this.on( "mustRegister", function( component, parent ){
			a7.log.trace( 'mustRegister: ' + this.props.id + ', parent: ' + parent.props.id );
			this.props.parentID = parent.props.id;
			a7.ui.register( this );
		}.bind( this ) );

		this.on( "mustRender", function(){
			a7.ui.enqueueForRender( this.props.id );
		}.bind( this ));

		this.on( "rendered", function(){
			this.mustRender = false;
			this.onRendered();
		}.bind( this ));

		this.on( "registered", function(){
			// register children
			if( this.props !== undefined && this.props.children !== undefined && this.props.children !== null ){
				for( var child in this.props.children ){
					if( a7.ui.getView( this.props.children[ child ].props.id ) === undefined ){
						a7.log.trace( 'parent: ' + this.props.id + ', register child: ' + this.props.children[ child ].props.id );
						this.props.children[ child ].fireEvent( "mustRegister", Object.assign( this ) );
					}
				}
			}
			if( this.props.parentID === undefined || this.mustRender ){
				// only fire render event for root views, children will render in the chain
				this.fireEvent( "mustRender" );
			}
		}.bind( this ));
	},
	events : ['mustRender','rendered', 'mustRegister', 'registered'],
  setState: function( args ){
    this.state = args;
    // setting state requires a re-render
		this.fireEvent( 'mustRender' );
	},
	render: function(){
		a7.log.info( 'render: ' + this.props.id );
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
		if( this.props !== undefined && this.props.children !== undefined && this.props.children !== null ){
			for( var child in this.props.children ){
				this.props.children[ child ].props.element = document.querySelector( this.props.children[ child ].props.selector );
				this.props.children[ child ].render();
			}
		}
	}
};
