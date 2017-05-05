import bind from '../bind';
import pathParser from './pathParser';


const Path = (props) => {
  const vector = {};
  pathParser(props.d || '', {
    M: (x, y) => vector.moveTo(x, y),
    L: (x, y) => vector.lineTo(x, y)
  });
};

export default bind(Path);