using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using SmartFund.Domain.Exceptions;

namespace SmartFund.API.Filters;

public sealed class DomainExceptionFilter : IExceptionFilter
{
    public void OnException(ExceptionContext context)
    {
        if (context.Exception is not DomainException ex)
            return;

        var problem = new ProblemDetails
        {
            Title = "Request rejected",
            Detail = ex.Message,
            Status = StatusCodes.Status400BadRequest
        };

        context.Result = new ObjectResult(problem)
        {
            StatusCode = StatusCodes.Status400BadRequest
        };

        context.ExceptionHandled = true;
    }
}
