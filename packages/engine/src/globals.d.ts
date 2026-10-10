// structuredClone is in every supported runtime (Node 17+, all modern browsers), but its
// type lives in the DOM and Node libraries, which this runtime-neutral package leaves out.
declare function structuredClone<T>(value: T): T;
