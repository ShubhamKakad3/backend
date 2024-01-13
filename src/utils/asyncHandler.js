
// by using promise -1
const asyncHandler = (requestHandler) => {
  return (req, res,next) => {
    Promise
      .resolve(requestHandler(req, res, next))
      .catch((error) =>
       next(error)
   );
 }
  
}
export {asyncHandler}




// by using trycatch black and async await -2
// const asyncHandler = (requestHandler) => {()=>{}}
// const asyncHandler = (requestHandler) => () => {} 
/*
const asyncHandler = (requestHandler) => async (req, res, next) => {
  try {
    await requestHandler(req, res, next);
  } catch (error) {
    res.status(err.code || 500).json({ success: false, message: err.message });
  }
}; 
export {asyncHandler}
*/