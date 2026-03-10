using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SmartFund.API.Contracts.PersonalFinance;
using SmartFund.Application.Interfaces;
using SmartFund.Domain.PersonalFinance.Entities;
using SmartFund.Domain.PersonalFinance.Enums;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace SmartFund.API.Controllers
{
    [ApiController]
    [Authorize]
    [Route("api/personal-categories")]
    public sealed class PersonalCategoryController : ControllerBase
    {
        private readonly IPersonalCategoryRepository _categories;

        public PersonalCategoryController(IPersonalCategoryRepository categories) =>
            _categories = categories;

        [HttpGet]
        public async Task<ActionResult<PersonalCategoryDto[]>> List(CancellationToken ct)
        {
            var categories = await _categories.ListAsync(ct);

            return Ok(categories.Select(c => new PersonalCategoryDto
            {
                Id = c.Id,
                Name = c.Name,
                Type = (int)c.Type
            }).ToArray());
        }

        [HttpPost]
        public async Task<ActionResult<PersonalCategoryDto>> Create(
            [FromBody] CreatePersonalCategoryRequest request,
            CancellationToken ct)
        {
            if (string.IsNullOrWhiteSpace(request.Name))
                return BadRequest("Category name is required.");

            if (!System.Enum.IsDefined(typeof(PersonalCategoryType), request.Type))
                return BadRequest("Invalid category type.");

            var category = PersonalCategory.Create(request.Name, (PersonalCategoryType)request.Type);
            try
            {
                await _categories.AddAsync(category, ct);
                await _categories.SaveChangesAsync(ct);
            }
            catch (DbUpdateException)
            {
                return Conflict("A category with the same name and type already exists.");
            }

            var dto = new PersonalCategoryDto
            {
                Id = category.Id,
                Name = category.Name,
                Type = (int)category.Type
            };

            return Created(string.Empty, dto);
        }

        [HttpPut("{id:long}")]
        public async Task<ActionResult<PersonalCategoryDto>> Rename(
            long id,
            [FromBody] RenamePersonalCategoryRequest request,
            CancellationToken ct)
        {
            if (string.IsNullOrWhiteSpace(request.Name))
                return BadRequest("Category name is required.");

            var category = await _categories.GetByIdAsync(id, ct);
            if (category is null)
                return NotFound();

            category.Rename(request.Name);
            try
            {
                await _categories.SaveChangesAsync(ct);
            }
            catch (DbUpdateException)
            {
                return Conflict("A category with the same name and type already exists.");
            }

            return Ok(new PersonalCategoryDto
            {
                Id = category.Id,
                Name = category.Name,
                Type = (int)category.Type
            });
        }
    }
}
