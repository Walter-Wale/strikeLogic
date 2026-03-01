module.exports = (sequelize, DataTypes) => {
  const H2HHistory = sequelize.define(
    "H2HHistory",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      parent_match_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: "parent_match_id",
        comment: "Foreign key reference to the main match being analyzed",
      },
      section_type: {
        type: DataTypes.ENUM("HOME_FORM", "AWAY_FORM", "DIRECT_H2H"),
        allowNull: false,
        field: "section_type",
        comment:
          "Categorizes which section this record belongs to: HOME_FORM (home team recent matches), AWAY_FORM (away team recent matches), or DIRECT_H2H (head-to-head history)",
      },
      match_date: {
        type: DataTypes.DATEONLY,
        allowNull: true,
        field: "match_date",
        comment: "Date when this historical match occurred",
      },
      home_team_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: "home_team_id",
        comment: "Foreign key to teams table",
      },
      away_team_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: "away_team_id",
        comment: "Foreign key to teams table",
      },
      home_score: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: "home_score",
        comment: "Home team score (null if match postponed/cancelled)",
      },
      away_score: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: "away_score",
        comment: "Away team score (null if match postponed/cancelled)",
      },
      competition: {
        type: DataTypes.STRING(100),
        allowNull: true,
        comment: "League or tournament name for this historical match",
      },
    },
    {
      tableName: "h2h_history",
      timestamps: false,
      underscored: true,
    },
  );

  H2HHistory.associate = (models) => {
    // H2H record belongs to a parent match
    H2HHistory.belongsTo(models.Match, {
      foreignKey: "parent_match_id",
      as: "parentMatch",
    });

    // H2H record belongs to home team
    H2HHistory.belongsTo(models.Team, {
      foreignKey: "home_team_id",
      as: "homeTeam",
    });

    // H2H record belongs to away team
    H2HHistory.belongsTo(models.Team, {
      foreignKey: "away_team_id",
      as: "awayTeam",
    });
  };

  return H2HHistory;
};
