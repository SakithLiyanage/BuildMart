import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import logo from '../assets/images/buildmart_logo1.png';
import axios from 'axios'; // Make sure axios is installed

function Ongoingworks() {
  const [ongoingWorks, setOngoingWorks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeWorkId, setActiveWorkId] = useState(null);
  const location = useLocation();
  
  // Calculate progress for each work based on completed milestones
  const calculateProgress = (milestones) => {
    if (!milestones || milestones.length === 0) return 0;
    
    const completedMilestones = milestones.filter(m => 
      m.status === 'Completed' || m.status === 'Paid'
    ).length;
    
    return Math.round((completedMilestones / milestones.length) * 100);
  };

  // Fetch ongoing works from the backend
  const fetchOngoingWorks = async () => {
    try {
      setIsLoading(true);
      
      // Get user ID from localStorage or context
      const userId = localStorage.getItem('userId');
      if (!userId) {
        throw new Error("User not authenticated");
      }
      
      // Make API call to fetch ongoing works
      const response = await axios.get(`/api/ongoingworks/client/${userId}`);
      
      // Transform and adapt the data to match the frontend format
      const formattedWorks = response.data.map(work => ({
        id: work._id,
        title: work.jobId?.title || 'Untitled Project',
        category: work.jobId?.category || 'General',
        contractor: work.contractorId, // You might want to fetch contractor details separately
        contractorId: work.contractorId,
        contractorPhone: work.jobId?.contractorPhone || '',
        contractorEmail: work.jobId?.contractorEmail || '',
        contractorImage: work.jobId?.contractorImage || 'https://randomuser.me/api/portraits/lego/1.jpg',
        location: work.jobId?.location || '',
        startDate: new Date(work.createdAt).toLocaleDateString('en-GB', {
          day: '2-digit',
          month: 'short',
          year: 'numeric'
        }),
        dueDate: work.jobId?.dueDate ? new Date(work.jobId.dueDate).toLocaleDateString('en-GB', {
          day: '2-digit',
          month: 'short',
          year: 'numeric'
        }) : 'Not specified',
        description: work.jobId?.description || '',
        progress: Math.round(work.workProgress) || calculateProgress(work.milestones),
        milestones: work.milestones.map(milestone => ({
          id: milestone._id,
          title: milestone.name,
          description: milestone.description,
          amount: milestone.amount,
          status: milestone.status.toLowerCase(),
          completedDate: milestone.completedAt 
            ? new Date(milestone.completedAt).toLocaleDateString('en-GB', {
                day: '2-digit',
                month: 'short',
                year: 'numeric'
              }) 
            : null
        }))
      }));
      
      setOngoingWorks(formattedWorks);
      
      // Set the first work as active if any exist
      if (formattedWorks.length > 0) {
        setActiveWorkId(formattedWorks[0].id);
      }
      
    } catch (err) {
      console.error('Error fetching ongoing works:', err);
      setError(err.message || 'Failed to fetch ongoing works');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch data when component mounts
  useEffect(() => {
    fetchOngoingWorks();
  }, []);

  // Handle payment for milestone
  const handlePayment = async (workId, milestoneId) => {
    try {
      if (window.confirm('Proceed with payment for this milestone?')) {
        // Make API call to update milestone status
        await axios.patch(`/api/ongoingworks/${workId}/milestone/${milestoneId}`, {
          status: 'Completed',
          actualAmountPaid: parseFloat(ongoingWorks.find(w => w.id === workId)
            .milestones.find(m => m.id === milestoneId).amount),
          completedAt: new Date()
        });
        
        // Refresh data after update
        fetchOngoingWorks();
      }
    } catch (err) {
      console.error('Error processing payment:', err);
      alert('Failed to process payment. Please try again.');
    }
  };

  // Handle verification of milestone completion
  const handleVerifyCompletion = async (workId, milestoneId) => {
    try {
      if (window.confirm('Confirm that this milestone has been completed?')) {
        // Update the milestone status to ready for payment
        // In a real application, this would make an API call
        setOngoingWorks(prevWorks => 
          prevWorks.map(work => {
            if (work.id === workId) {
              const updatedMilestones = work.milestones.map(milestone => {
                if (milestone.id === milestoneId) {
                  return {
                    ...milestone,
                    status: 'ready_for_payment'
                  };
                }
                return milestone;
              });
              
              return {
                ...work,
                milestones: updatedMilestones
              };
            }
            return work;
          })
        );
      }
    } catch (err) {
      console.error('Error verifying milestone completion:', err);
      alert('Failed to verify milestone. Please try again.');
    }
  };

  // Get active work details
  const activeWork = ongoingWorks.find(work => work.id === activeWorkId);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-3 text-gray-600">Loading ongoing works...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md p-6 bg-white rounded-xl shadow-md">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-red-500 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h2 className="mt-4 text-xl font-bold text-gray-800">Something went wrong</h2>
          <p className="mt-2 text-gray-600">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (ongoingWorks.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-lg shadow-sm py-4 px-6 border-b border-gray-200">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <Link to="/">
                <img src={logo} alt="BuildMart Logo" className="h-10" />
              </Link>
              <h1 className="text-xl font-semibold text-gray-800">My Ongoing Projects</h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <Link 
                to="/dashboard" 
                className="text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors"
              >
                Back to Dashboard
              </Link>
            </div>
          </div>
        </header>

        <div className="flex flex-col items-center justify-center p-10 h-[80vh]">
          <div className="p-8 text-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-gray-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            <h2 className="text-2xl font-bold text-gray-700 mb-2">No Ongoing Projects</h2>
            <p className="text-gray-500 mb-6">You don't have any ongoing projects at the moment.</p>
            <Link 
              to="/dashboard" 
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Return to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Rest of your component remains unchanged...
  return (
    <div className="min-h-screen flex flex-col bg-gray-50 text-gray-800">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-lg shadow-sm py-4 px-6 border-b border-gray-200">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <Link to="/">
              <img src={logo} alt="BuildMart Logo" className="h-10" />
            </Link>
            <h1 className="text-xl font-semibold text-gray-800">My Ongoing Projects</h1>
          </div>
          
          <div className="flex items-center space-x-4">
            <Link 
              to="/dashboard" 
              className="text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>
      </header>

      <div className="flex-1 max-w-7xl mx-auto w-full px-4 py-8 md:px-6">
        <div className="flex flex-col md:flex-row gap-6">
          {/* Sidebar - Project List */}
          <div className="w-full md:w-1/3 lg:w-1/4">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3">
                <h2 className="text-white font-medium">My Projects</h2>
              </div>
              <div className="divide-y divide-gray-200">
                {ongoingWorks.map(work => (
                  <button
                    key={work.id}
                    className={`w-full text-left px-4 py-3 transition-colors ${
                      activeWorkId === work.id
                        ? 'bg-blue-50 border-l-4 border-blue-600'
                        : 'hover:bg-gray-50 border-l-4 border-transparent'
                    }`}
                    onClick={() => setActiveWorkId(work.id)}
                  >
                    <div className="flex justify-between items-center">
                      <h3 className={`font-medium ${
                        activeWorkId === work.id ? 'text-blue-700' : 'text-gray-800'
                      }`}>
                        {work.title}
                      </h3>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        work.progress < 30
                          ? 'bg-yellow-100 text-yellow-800'
                          : work.progress < 70
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-green-100 text-green-800'
                      }`}>
                        {work.progress}%
                      </span>
                    </div>
                    <div className="flex justify-between items-center mt-1">
                      <p className="text-xs text-gray-500">{work.category}</p>
                      <p className="text-xs text-gray-500">Due: {work.dueDate}</p>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
                      <div
                        className={`h-1.5 rounded-full ${
                          work.progress < 30
                            ? 'bg-yellow-500'
                            : work.progress < 70
                              ? 'bg-blue-500'
                              : 'bg-green-500'
                        }`}
                        style={{ width: `${work.progress}%` }}
                      ></div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Main Content - Project Details */}
          {activeWork && (
            <div className="flex-1">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                {/* Project header */}
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h2 className="text-xl font-semibold text-white">{activeWork.title}</h2>
                      <div className="flex items-center mt-1 space-x-2">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-200 text-blue-800">
                          {activeWork.category}
                        </span>
                        <span className="text-sm text-blue-100">{activeWork.location}</span>
                      </div>
                    </div>
                    <div className="bg-white/20 backdrop-blur-sm rounded-lg px-3 py-2 text-center">
                      <div className="text-2xl font-bold text-white">{activeWork.progress}%</div>
                      <div className="text-xs text-blue-100">Complete</div>
                    </div>
                  </div>
                </div>
                
                {/* Project body */}
                <div className="p-6">
                  {/* Project details */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    <div>
                      <h3 className="text-sm font-medium text-gray-500 mb-2">Project Description</h3>
                      <p className="text-gray-800">{activeWork.description}</p>
                      
                      <div className="mt-4">
                        <h3 className="text-sm font-medium text-gray-500 mb-2">Timeline</h3>
                        <div className="flex justify-between items-center">
                          <div>
                            <div className="text-xs text-gray-500">Start Date</div>
                            <div className="font-medium">{activeWork.startDate}</div>
                          </div>
                          <div className="border-t-2 border-dashed border-gray-300 flex-1 mx-4 relative">
                            <div 
                              className="absolute top-0 h-2 bg-blue-500" 
                              style={{ 
                                width: `${activeWork.progress}%`, 
                                transform: 'translateY(-50%)'
                              }}
                            ></div>
                          </div>
                          <div className="text-right">
                            <div className="text-xs text-gray-500">Due Date</div>
                            <div className="font-medium text-blue-600">{activeWork.dueDate}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h3 className="text-sm font-medium text-gray-500 mb-3">Contractor Information</h3>
                      <div className="flex items-center">
                        <img 
                          src={activeWork.contractorImage}
                          alt={activeWork.contractor}
                          className="w-12 h-12 rounded-full object-cover"
                        />
                        <div className="ml-4">
                          <div className="font-medium">{activeWork.contractor}</div>
                          <div className="text-sm text-gray-500 mt-1">{activeWork.contractorPhone}</div>
                        </div>
                      </div>
                      
                      <div className="mt-4 flex space-x-2">
                        <button 
                          onClick={() => window.open(`tel:${activeWork.contractorPhone}`, '_self')}
                          className="flex-1 inline-flex justify-center items-center px-3 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                          </svg>
                          Call
                        </button>
                        <button 
                          onClick={() => window.open(`mailto:${activeWork.contractorEmail}`, '_blank')}
                          className="flex-1 inline-flex justify-center items-center px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                          Email
                        </button>
                        <button 
                          onClick={() => window.open(`/chat/${activeWork.contractorId}`, '_blank')}
                          className="flex-1 inline-flex justify-center items-center px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                          </svg>
                          Chat
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  {/* Milestones section */}
                  <div className="mt-8">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-medium text-gray-900">Payment Milestones</h3>
                      <span className="text-sm text-gray-500">
                        {activeWork.milestones.filter(m => m.status === 'completed').length} of {activeWork.milestones.length} completed
                      </span>
                    </div>
                    
                    <div className="space-y-4">
                      {activeWork.milestones.map((milestone) => (
                        <div 
                          key={milestone.id} 
                          className={`bg-white rounded-lg border ${
                            milestone.status === 'completed' 
                              ? 'border-green-200' 
                              : milestone.status === 'ready_for_payment'
                                ? 'border-blue-200'
                                : milestone.status === 'in_progress'
                                  ? 'border-yellow-200'
                                  : 'border-gray-200'
                          } p-4 transition-all hover:shadow-md`}
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex items-center">
                              <div className={`flex items-center justify-center w-10 h-10 rounded-full mr-4 ${
                                milestone.status === 'completed' 
                                  ? 'bg-green-100 text-green-600' 
                                  : milestone.status === 'ready_for_payment'
                                    ? 'bg-blue-100 text-blue-600'
                                    : milestone.status === 'in_progress'
                                      ? 'bg-yellow-100 text-yellow-600'
                                      : 'bg-gray-100 text-gray-400'
                              }`}>
                                {milestone.status === 'completed' ? (
                                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                                  </svg>
                                ) : milestone.status === 'ready_for_payment' ? (
                                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                  </svg>
                                ) : milestone.status === 'in_progress' ? (
                                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                  </svg>
                                ) : (
                                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                  </svg>
                                )}
                              </div>
                              <div>
                                <h4 className="font-medium text-gray-900">{milestone.title}</h4>
                                <p className="text-sm text-gray-600 mt-1">{milestone.description}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-sm text-gray-500">Amount</div>
                              <div className="text-lg font-semibold text-gray-900">LKR {milestone.amount}</div>
                            </div>
                          </div>
                          
                          <div className="mt-4 flex items-center justify-between">
                            <div className="flex items-center">
                              <div className={`w-3 h-3 rounded-full mr-2 ${
                                milestone.status === 'completed' 
                                  ? 'bg-green-500' 
                                  : milestone.status === 'ready_for_payment'
                                    ? 'bg-blue-500'
                                    : milestone.status === 'in_progress'
                                      ? 'bg-yellow-500'
                                      : 'bg-gray-300'
                              }`}></div>
                              <span className="text-sm font-medium capitalize">
                                {milestone.status === 'ready_for_payment' 
                                  ? 'Ready for payment' 
                                  : milestone.status === 'in_progress'
                                    ? 'In progress'
                                    : milestone.status}
                              </span>
                              {milestone.completedDate && (
                                <span className="text-sm text-gray-500 ml-2">
                                  • Completed on {milestone.completedDate}
                                </span>
                              )}
                            </div>
                            
                            {/* Action buttons based on status */}
                            {milestone.status === 'ready_for_payment' && (
                              <button 
                                onClick={() => handlePayment(activeWork.id, milestone.id)}
                                className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
                              >
                                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"></path>
                                </svg>
                                Make Payment
                              </button>
                            )}
                            
                            {milestone.status === 'in_progress' && (
                              <button 
                                onClick={() => handleVerifyCompletion(activeWork.id, milestone.id)}
                                className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200"
                              >
                                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                </svg>
                                Verify Completion
                              </button>
                            )}
                            
                            {milestone.status === 'completed' && (
                              <span className="inline-flex items-center px-3 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                                <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                                </svg>
                                Paid
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {/* Project issues section */}
                  <div className="mt-8 flex justify-end">
                    <button 
                      onClick={() => alert('Opening issue report form...')}
                      className="text-sm text-red-600 hover:text-red-800 hover:underline flex items-center"
                    >
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                      </svg>
                      Report an issue with this project
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Ongoingworks;