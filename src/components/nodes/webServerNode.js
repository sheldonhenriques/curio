import ServerNode from '@/components/nodes/serverNode';
import ErrorBoundary from '@/components/common/ErrorBoundary';

// Wrap ServerNode with ErrorBoundary for better error handling
const WrappedServerNode = (props) => (
  <ErrorBoundary>
    <ServerNode {...props} />
  </ErrorBoundary>
);

export { WrappedServerNode as ServerNode };
export default { ServerNode: WrappedServerNode };