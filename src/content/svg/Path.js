import bind from '../bind';
import pathParser from './pathParser';

const mapping = {
  M: 'moveTo',
  L: 'lineTo',
  m: 'moveToR',
  l: 'lienToR'
};

const Path = (props) => {
  const vector = {};
 
  pathParser(props.d || '', {
    M: (x, y) => vector.moveTo(x, y),
    L: (x, y) => vector.lineTo(x, y),
    m: (x, y) => vector.moveTo(x, y),
  });
};

export default bind(Path);