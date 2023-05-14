import bind from './bind';
import Document from '..';

class DocumentComponent {
  getChildContext() {
    return {
      document: new Document()
    };
  }
}

export default bind('document', DocumentComponent);
