/*
 * Pragma
 *
 * @param type - The Component to bind to a vnode
 * @param props - properties for this vnode
 * @param children - any children for this vnode
 * @param component - if this is a "native" component, this is the class
 *  or render function which is used to actually put content on the PDF
 *
 * @returns The virtual node in the PDF tree
 */
export default (type: any, props: any, children: any, component: any) => {
  const result = {
    type,
    props,
    children,
    component
  };

  return result;
};
