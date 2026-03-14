module.exports = (sequelize, DataTypes) => {
  const SavedTicketItem = sequelize.define(
    "SavedTicketItem",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      batch_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: "batch_id",
        comment: "FK to saved_ticket_batches",
      },
      ticket_number: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: "ticket_number",
        comment: "1-indexed ticket number within the batch",
      },
      position: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: "1-indexed position of this match within its ticket",
      },
      home_team: {
        type: DataTypes.STRING(255),
        allowNull: false,
        field: "home_team",
      },
      away_team: {
        type: DataTypes.STRING(255),
        allowNull: false,
        field: "away_team",
      },
      predicted_winner: {
        type: DataTypes.STRING(255),
        allowNull: false,
        field: "predicted_winner",
      },
      league_name: {
        type: DataTypes.STRING(100),
        allowNull: true,
        field: "league_name",
      },
      match_date: {
        type: DataTypes.DATEONLY,
        allowNull: true,
        field: "match_date",
      },
      match_time: {
        type: DataTypes.TIME,
        allowNull: true,
        field: "match_time",
      },
      odds_home: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: true,
        field: "odds_home",
      },
      odds_draw: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: true,
        field: "odds_draw",
      },
      odds_away: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: true,
        field: "odds_away",
      },
    },
    {
      tableName: "saved_ticket_items",
      timestamps: false,
    },
  );

  SavedTicketItem.associate = (models) => {
    SavedTicketItem.belongsTo(models.SavedTicketBatch, {
      foreignKey: "batch_id",
      as: "batch",
    });
  };

  return SavedTicketItem;
};
