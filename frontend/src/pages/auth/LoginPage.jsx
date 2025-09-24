import { Link } from "react-router-dom";
import LoginForm from "../../components/auth/LoginForm";

const LoginPage = () => {
	return (
		<div className='min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8'>
			<div className='sm:mx-auto sm:w-full sm:max-w-md'>
				<img className='mx-auto h-60 w-auto' src='/logo.png' alt='hierAi' />
				<h2 className=' text-center text-3xl font-extrabold text-gray-100'>Sign in to your account</h2>
			</div>

			<div className='mt-8 sm:mx-auto sm:w-full sm:max-w-md shadow-md'>
				<div className='bg-base-300 py-8 px-4 shadow sm:rounded-lg sm:px-10'>
					<LoginForm />
					<div className='mt-6'>
						<div className='relative'>
							<div className='absolute inset-0 flex items-center'>
								<div className='w-full border-t border-gray-300'></div>
							</div>
							<div className='relative flex justify-center text-sm'>
								<span className='px-2 bg-base-100 text-gray-500'>New to HIerAi?</span>
							</div>
						</div>
					<div className='mt-6'>
						<Link
							to='/signup'
							className='w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-blue-600 bg-base-100 hover:bg-gray-200'
						>
							Join now
						</Link>
					</div>
					</div>
				</div>
			</div>
		</div>
	);
};
export default LoginPage;
