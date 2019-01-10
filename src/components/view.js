function View( props ){
	this.renderer = a7.model.get("a7.ui").renderer;
	this.type = 'View';
	this.props = props;
	if( this.props !== undefined ){
		for( var prop in this.props ){
			if( props[ prop ].type !== undefined && props[ prop ].type === 'View' ){
				props[ prop ].on( "mustRender", function(){
					this.fireEvent( "mustRender" );
				}.bind( this ));
			}
		}
	}

	this.state = {};
  this.template = "";
}

View.prototype = {
	events : ['mustRender','rendered'],
  setState: function( args ){
    this.state = args;
    // setting state requires a re-render
		this.fireEvent( 'mustRender' );
  },
  render: function(){
    return this.template;
  }
};
