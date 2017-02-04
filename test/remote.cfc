/**
 * remote
 *
 * @author rmunn
 * @date 1/20/17
 **/
component {
	remote any function getDate() returnformat="json"{
		return serializeJSON( dateformat( now(), 'yyyy-mm-dd') );
	}
}