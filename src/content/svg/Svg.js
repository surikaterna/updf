import bind from '../bind';

class Svg {
  constructor(props, context) {
    // width
    // height
    // viewBox
    // create transformation matrix?
  }
  getChildContext() {
    return {
      svg: this
    };
  }
}

export default bind('svg', Svg);
