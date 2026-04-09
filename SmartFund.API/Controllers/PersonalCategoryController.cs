using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SmartFund.API.Contracts.PersonalFinance;
using SmartFund.API.Infrastructure;
using SmartFund.Application.Interfaces;
using SmartFund.Domain.PersonalFinance.Entities;
using SmartFund.Domain.PersonalFinance.Enums;
using SmartFund.Persistence.DbContext;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace SmartFund.API.Controllers
{
    [ApiController]
    [Authorize]
    [Route("api/personal-categories")]
    public sealed class PersonalCategoryController : SmartFundControllerBase
    {
        private readonly IPersonalCategoryRepository _categories;
        private readonly SmartFundDbContext _db;

        public PersonalCategoryController(IPersonalCategoryRepository categories, SmartFundDbContext db)
        {
            _categories = categories;
            _db = db;
        }

        [HttpGet]
        public async Task<ActionResult<PersonalCategoryDto[]>> List(CancellationToken ct)
        {
            var categories = await _categories.ListByUserAsync(GetCurrentUserId(), ct);

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

            var category = PersonalCategory.Create(GetCurrentUserId(), request.Name, (PersonalCategoryType)request.Type);
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

        [HttpPost("bulk")]
        public async Task<IActionResult> BulkCreate(
            [FromBody] BulkCreateCategoriesRequest request,
            CancellationToken ct)
        {
            if (request.Categories is null || request.Categories.Length == 0)
                return Ok(new { created = 0, skipped = 0 });

            var userId = GetCurrentUserId();
            var total = request.Categories.Length;

            // Pre-fetch existing to skip duplicates without relying on DB constraint errors
            var existing = await _categories.ListByUserAsync(userId, ct);
            var existingKeys = new System.Collections.Generic.HashSet<string>(
                existing.Select(c => $"{c.Name.Trim().ToLowerInvariant()}:{(int)c.Type}"));

            var toAdd = new System.Collections.Generic.List<PersonalCategory>();

            foreach (var item in request.Categories)
            {
                if (string.IsNullOrWhiteSpace(item.Name) ||
                    !System.Enum.IsDefined(typeof(PersonalCategoryType), item.Type))
                    continue;

                var key = $"{item.Name.Trim().ToLowerInvariant()}:{item.Type}";
                if (existingKeys.Contains(key))
                    continue;

                existingKeys.Add(key); // prevent dupes within the same request
                toAdd.Add(PersonalCategory.Create(userId, item.Name.Trim(), (PersonalCategoryType)item.Type));
            }

            foreach (var cat in toAdd)
                await _categories.AddAsync(cat, ct);

            if (toAdd.Count > 0)
                await _categories.SaveChangesAsync(ct);

            return Ok(new { created = toAdd.Count, skipped = total - toAdd.Count });
        }

        [HttpDelete("{id:long}")]
        public async Task<IActionResult> Delete(long id, CancellationToken ct)
        {
            var userId = GetCurrentUserId();
            var category = await _categories.GetByIdForUserAsync(id, userId, ct);
            if (category is null)
                return NotFound();

            var inUse = await _db.PersonalTransactions
                .AnyAsync(t => t.CategoryId == id, ct);

            if (inUse)
                return Conflict(new { error = "This category is used by existing transactions and cannot be deleted." });

            await _categories.RemoveAsync(category, ct);
            await _categories.SaveChangesAsync(ct);
            return NoContent();
        }

        [HttpPut("{id:long}")]
        public async Task<ActionResult<PersonalCategoryDto>> Rename(
            long id,
            [FromBody] RenamePersonalCategoryRequest request,
            CancellationToken ct)
        {
            if (string.IsNullOrWhiteSpace(request.Name))
                return BadRequest("Category name is required.");

            var category = await _categories.GetByIdForUserAsync(id, GetCurrentUserId(), ct);
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
