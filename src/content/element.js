

/*
 * Pragma
 *
 * @param type - The Component to bind to a vnode
 * @param props - properties for this vnode
 * @param children - any children for this vnode
 * @param render - if this is a "native" component, this is the render
 *  method which is used to actually put content on the PDF
 *
 * @returns The virtual node in the PDF tree
 */
export default (type, props, children, render) => {
  return {
    type,
    props,
    children,
    render
  };
};

