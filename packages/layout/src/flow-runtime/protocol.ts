export interface FragmentCall<Request, Fragment> {
  readonly block: FragmentProducer<Request, Fragment>;
  readonly request: Request;
}
export interface FragmentProducer<Request, Fragment> {
  readonly fragment: (request: Request) => Fragment | undefined;
  readonly fragmentSteps?: (
    request: Request,
  ) => Generator<FragmentCall<Request, Fragment>, Fragment | undefined, Fragment | undefined>;
}
export interface PaintCall<Context, Node> {
  readonly fragment: PaintProducer<Context, Node>;
  readonly context: Context;
}
export interface PaintProducer<Context, Node> {
  readonly paint: (context: Context) => readonly Node[];
  readonly paintSteps?: (context: Context) => Generator<PaintCall<Context, Node>, readonly Node[], readonly Node[]>;
}
