import React from 'react'
import SignUpForm from '../../components/auth/SignUpForm.jsx'
import { Link } from 'react-router-dom'
const SignUpPage = () => {
  return (
    <div className='min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8'>
			<div className='sm:mx-auto sm:w-full sm:max-w-md flex flex-col justify-center'>
				<img className='mx-auto h-60 w-auto' src='/logo.png' alt='hierAi' />
				<h2 className='text-center text-3xl font-extrabold text-gray-500'>
					Make the most of your professional life
				</h2>
			</div>
			<div className='mt-8 sm:mx-auto sm:w-full sm:max-w-md shadow-md'>
				<div className='bg-base-300 py-8 px-4 shadow sm:rounded-lg sm:px-10'>
					<SignUpForm />

					<div className='mt-6'>
						<div className='relative'>
							<div className='absolute inset-0 flex items-center'>
								<div className='w-full border-t border-gray-300'></div>
							</div>
							<div className='relative flex justify-center text-sm'>
								<span className='px-2 bg-white text-gray-500'>Already on LinkedIn?</span>
							</div>
						</div>
						<div className='mt-6'>
						<Link to='/login'>
							<button className='btn btn-soft w-full flex justify-center py-2 px-4 '>
								Sign in
							</button>
						</Link>
						</div>
					</div>
				</div>
			</div>
		</div>
  );
};

export default SignUpPage
