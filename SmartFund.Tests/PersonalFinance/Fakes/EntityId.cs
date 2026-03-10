using System;
using System.Reflection;

namespace SmartFund.Tests.PersonalFinance.Fakes;

internal static class EntityId
{
    public static void Set<TEntity>(TEntity entity, long id)
        where TEntity : class
    {
        var prop = typeof(TEntity).GetProperty("Id", BindingFlags.Instance | BindingFlags.Public | BindingFlags.NonPublic);
        if (prop is null)
            throw new InvalidOperationException($"Type {typeof(TEntity).Name} does not have an Id property.");

        prop.SetValue(entity, id);
    }
}
