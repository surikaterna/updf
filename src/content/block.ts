import bind from './bind';
import border from './styles/border';

/** blocks are full parent width by default */
const block = (props: any, context: any) => {
  border(props, context);
};

export default bind('block', block);
