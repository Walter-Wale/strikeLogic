module.exports = (sequelize, DataTypes) => {
  const SavedTicketBatch = sequelize.define(
    "SavedTicketBatch",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      match_date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        field: "match_date",
        comment: "The prediction date these tickets were generated for",
      },
      saved_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        field: "saved_at",
        comment: "Timestamp when the tickets were saved",
      },
      ticket_count: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: "ticket_count",
        comment: "Number of tickets in this batch",
      },
      teams_per_ticket: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: "teams_per_ticket",
        comment: "Number of matches per ticket",
      },
    },
    {
      tableName: "saved_ticket_batches",
      timestamps: false,
    },
  );

  SavedTicketBatch.associate = (models) => {
    SavedTicketBatch.hasMany(models.SavedTicketItem, {
      foreignKey: "batch_id",
      as: "items",
      onDelete: "CASCADE",
    });
  };

  return SavedTicketBatch;
};
