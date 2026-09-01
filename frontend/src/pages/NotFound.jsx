import { Link } from 'react-router-dom'

const NotFound = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center px-4">
      <h1 className="text-8xl font-extrabold text-prism-border mb-4">404</h1>
      <h2 className="text-2xl font-bold text-prism-text-primary mb-2">Page Not Found</h2>
      <p className="text-prism-text-muted mb-8">The page you're looking for doesn't exist.</p>
      <Link to="/" className="btn-primary">Go Home</Link>
    </div>
  )
}

export default NotFound